import type { SupabaseClient } from "@supabase/supabase-js";
import { generateBlueprintPlanFromParsedData } from "@/lib/generate-blueprint-claude";

function extractBlueprintDataFromParse(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const bd = (raw as Record<string, unknown>).blueprint_data;
  if (!bd || typeof bd !== "object" || Array.isArray(bd)) return null;
  return bd as Record<string, unknown>;
}

function blueprintDataIsPopulated(data: unknown): boolean {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return false;
  return Object.keys(data as object).length > 0;
}

/**
 * Same generation path as POST /api/generate-blueprint (Claude + DB update).
 * Skips work if the row is already ready with non-empty blueprint_data.
 */
export async function runBlueprintGenerationForBlueprint(
  admin: SupabaseClient,
  clientId: string,
  blueprintId: string,
): Promise<{ ok: true; skipped: boolean } | { ok: false; error: string }> {
  const { data: row, error: fetchError } = await admin
    .from("blueprints")
    .select("id, client_id, raw_parse_data, blueprint_data, status")
    .eq("id", blueprintId)
    .maybeSingle();

  if (fetchError || !row || row.client_id !== clientId) {
    return { ok: false, error: "Blueprint not found." };
  }

  if (row.status === "ready" && blueprintDataIsPopulated(row.blueprint_data)) {
    return { ok: true, skipped: true };
  }

  const raw = row.raw_parse_data;
  if (raw == null || (typeof raw === "object" && raw !== null && Object.keys(raw as object).length === 0)) {
    return { ok: false, error: "Blueprint has no raw_parse_data to generate from." };
  }

  let plan: unknown;
  try {
    const fromParse = extractBlueprintDataFromParse(raw);
    if (fromParse) {
      plan = fromParse;
    } else {
      plan = await generateBlueprintPlanFromParsedData(raw);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Claude generation failed.";
    return { ok: false, error: message };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("blueprints")
    .update({
      blueprint_data: plan,
      status: "ready",
      updated_at: now,
    })
    .eq("id", blueprintId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, skipped: false };
}
