import type { SupabaseClient } from "@supabase/supabase-js";
import { generateBlueprintPlanFromParsedData } from "@/lib/generate-blueprint-claude";
import { notifyAutoReadyAlert } from "@/lib/notify-auto-ready";
import { parseBureauPdfWithClaude } from "@/lib/parse-bureau-claude";
import { regenerateCurrentMonthlyPlanAfterBureauUpdate } from "@/lib/sync-monthly-progress";

function extractBlueprintDataFromParse(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== "object") return null;
  const bd = (parsed as Record<string, unknown>).blueprint_data;
  if (!bd || typeof bd !== "object" || Array.isArray(bd)) return null;
  return bd as Record<string, unknown>;
}

/**
 * Parse a bureau PDF buffer, insert/update blueprint for `userId` (same pipeline as `/api/parse-bureau`).
 * Used by VA admin onboard and can be called from the parse route after downloading the PDF.
 * Preserves `current_month`, `month_unlocked_at`, and action completions when updating an existing bureau.
 */
export async function parsePdfBufferAndSaveBlueprintForUser(
  admin: SupabaseClient,
  userId: string,
  pdfBuffer: Buffer,
  options?: { clientEmail?: string | null },
): Promise<{ ok: true; blueprintId: string } | { ok: false; error: string }> {
  if (pdfBuffer.length > 10 * 1024 * 1024) {
    return { ok: false, error: "PDF exceeds 10MB." };
  }

  const pdfBase64 = pdfBuffer.toString("base64");

  let parsed: unknown;
  try {
    parsed = await parseBureauPdfWithClaude(pdfBase64);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Claude parse failed.";
    return { ok: false, error: message };
  }

  const nowIso = new Date().toISOString();

  const { data: existing, error: exErr } = await admin
    .from("blueprints")
    .select("id")
    .eq("client_id", userId)
    .eq("month_number", 1)
    .maybeSingle();

  if (exErr) {
    return { ok: false, error: exErr.message };
  }

  let blueprintId: string;

  if (existing?.id) {
    blueprintId = String(existing.id);
    const { error: up0 } = await admin
      .from("blueprints")
      .update({
        status: "processing",
        raw_parse_data: parsed,
        bureau_uploaded_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", blueprintId);
    if (up0) {
      return { ok: false, error: up0.message };
    }
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("blueprints")
      .insert({
        client_id: userId,
        month_number: 1,
        status: "processing",
        raw_parse_data: parsed,
        bureau_uploaded_at: nowIso,
        current_month: 1,
        updated_at: nowIso,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    blueprintId = (inserted?.id as string | undefined) ?? "";
    if (!blueprintId) {
      return { ok: false, error: "Blueprint insert returned no id." };
    }

    const createdAt = (inserted as { created_at?: string })?.created_at ?? nowIso;
    const { error: alignErr } = await admin
      .from("blueprints")
      .update({ month_unlocked_at: createdAt })
      .eq("id", blueprintId);
    if (alignErr) {
      return { ok: false, error: alignErr.message };
    }
  }

  const blueprintFromParse = extractBlueprintDataFromParse(parsed);
  const updatePayload: Record<string, unknown> = {
    status: "ready",
    updated_at: nowIso,
    ...(blueprintFromParse ? { blueprint_data: blueprintFromParse } : {}),
  };

  const { error: readyError } = await admin.from("blueprints").update(updatePayload).eq("id", blueprintId);

  if (readyError) {
    return { ok: false, error: readyError.message };
  }

  if (blueprintFromParse?.auto_ready_alert === true) {
    const readiness = blueprintFromParse.readiness_percentage;
    void notifyAutoReadyAlert({
      blueprintId,
      clientId: userId,
      clientEmail: options?.clientEmail ?? null,
      readinessPercentage: typeof readiness === "number" ? readiness : undefined,
    }).catch(() => {});
  }

  if (!blueprintFromParse) {
    const raw = parsed;
    if (raw == null || (typeof raw === "object" && raw !== null && Object.keys(raw as object).length === 0)) {
      try {
        await regenerateCurrentMonthlyPlanAfterBureauUpdate(admin, userId, blueprintId);
      } catch {
        /* non-fatal */
      }
      return { ok: true, blueprintId };
    }
    try {
      const plan = await generateBlueprintPlanFromParsedData(raw);
      const { error: genErr } = await admin
        .from("blueprints")
        .update({
          blueprint_data: plan,
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", blueprintId);
      if (genErr) {
        return { ok: false, error: genErr.message };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Blueprint generation failed.";
      return { ok: false, error: message };
    }
  }

  try {
    await regenerateCurrentMonthlyPlanAfterBureauUpdate(admin, userId, blueprintId);
  } catch (e) {
    console.warn("[regenerateCurrentMonthlyPlanAfterBureauUpdate]", e);
  }

  return { ok: true, blueprintId };
}
