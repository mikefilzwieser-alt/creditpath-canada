import type { SupabaseClient } from "@supabase/supabase-js";
import { generateMonthlyPlanWithClaude } from "@/lib/generate-monthly-plan-claude";
import { getProgramMonthThemeTitle, MAX_THEMED_PROGRAM_MONTH, normalizeProgramMonth } from "@/lib/monthly-progression-themes";
import { sendMonthUnlockEmail } from "@/lib/send-month-unlock-email";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe-token";

const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;

export type BlueprintProgressRow = {
  id: string;
  client_id: string;
  created_at: string;
  current_month: number | null;
  month_unlocked_at: string | null;
  raw_parse_data: unknown;
};

function allThreeActionsComplete(completions: Array<{ program_month?: number | null; action_index?: number | null }>, programMonth: number): boolean {
  const indexes = new Set<number>();
  for (const c of completions) {
    const pm = typeof c.program_month === "number" && Number.isFinite(c.program_month) ? c.program_month : 1;
    if (pm !== programMonth) continue;
    const idx = c.action_index;
    if (typeof idx === "number" && Number.isFinite(idx)) indexes.add(idx);
  }
  return indexes.has(0) && indexes.has(1) && indexes.has(2);
}

async function fetchCompletions(
  admin: SupabaseClient,
  clientId: string,
  blueprintId: string,
): Promise<Array<{ program_month?: number | null; action_index?: number | null; action_text?: string | null }>> {
  const { data, error } = await admin
    .from("action_completions")
    .select("program_month, action_index, action_text")
    .eq("client_id", clientId)
    .eq("blueprint_id", blueprintId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ program_month?: number | null; action_index?: number | null; action_text?: string | null }>;
}

export async function ensureMonthlyPlanRow(
  admin: SupabaseClient,
  args: {
    clientId: string;
    blueprintId: string;
    programMonth: number;
    rawParseData: unknown;
    completions: Array<{ program_month?: number | null; action_index?: number | null; action_text?: string | null }>;
    preserveUnlockedAt?: string | null;
  },
): Promise<void> {
  const { clientId, blueprintId, programMonth, rawParseData, completions, preserveUnlockedAt } = args;
  if (programMonth < 2 || programMonth > MAX_THEMED_PROGRAM_MONTH) return;

  const theme = getProgramMonthThemeTitle(programMonth);
  const completedSummary = completions
    .filter((c) => (typeof c.program_month === "number" ? c.program_month : 1) < programMonth)
    .map((c) => ({
      month: typeof c.program_month === "number" ? c.program_month : 1,
      action_index: c.action_index,
      action_text: c.action_text,
    }));

  const actions = await generateMonthlyPlanWithClaude({
    programMonth,
    rawParseData,
    completedActionsSummary: completedSummary,
  });

  const nowIso = new Date().toISOString();
  const unlockedAt = preserveUnlockedAt ?? nowIso;

  const { error } = await admin.from("monthly_plans").upsert(
    {
      client_id: clientId,
      blueprint_id: blueprintId,
      month_number: programMonth,
      theme,
      actions,
      generated_at: nowIso,
      unlocked_at: unlockedAt,
    },
    { onConflict: "client_id,blueprint_id,month_number" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Advances program months when actions + 28-day rules are satisfied; generates themed months 2–4.
 * Returns metadata for the API layer to show celebration UI.
 */
export async function syncMonthlyProgressForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ updated: boolean; advancedToMonth: number | null; theme: string | null }> {
  const { data: bp, error: bpErr } = await admin
    .from("blueprints")
    .select("id, client_id, created_at, current_month, month_unlocked_at, raw_parse_data")
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bpErr) throw new Error(bpErr.message);
  if (!bp?.id) {
    return { updated: false, advancedToMonth: null, theme: null };
  }

  const blueprint = bp as BlueprintProgressRow;
  let currentMonth = normalizeProgramMonth(blueprint.current_month as number | null);
  let monthUnlockedAt = blueprint.month_unlocked_at ?? blueprint.created_at;
  let advancedToMonth: number | null = null;
  let theme: string | null = null;
  let updated = false;

  if (!blueprint.month_unlocked_at) {
    const { error: fixErr } = await admin
      .from("blueprints")
      .update({ month_unlocked_at: blueprint.created_at, current_month: currentMonth })
      .eq("id", blueprint.id);
    if (fixErr) throw new Error(fixErr.message);
    monthUnlockedAt = blueprint.created_at;
    updated = true;
  }

  const completions = await fetchCompletions(admin, userId, blueprint.id);
  const now = Date.now();
  const createdAtMs = new Date(blueprint.created_at).getTime();

  // Repair missing monthly plan for current themed month (2–4)
  if (currentMonth >= 2 && currentMonth <= MAX_THEMED_PROGRAM_MONTH) {
    const { data: existingPlan } = await admin
      .from("monthly_plans")
      .select("id, unlocked_at")
      .eq("blueprint_id", blueprint.id)
      .eq("month_number", currentMonth)
      .maybeSingle();
    if (!existingPlan?.id) {
      await ensureMonthlyPlanRow(admin, {
        clientId: userId,
        blueprintId: blueprint.id,
        programMonth: currentMonth,
        rawParseData: blueprint.raw_parse_data,
        completions,
        preserveUnlockedAt: null,
      });
      updated = true;
    }
  }

  while (currentMonth < 5) {
    const threeDone = allThreeActionsComplete(completions, currentMonth);
    if (!threeDone) break;

    const gateStartMs = currentMonth === 1 ? createdAtMs : new Date(monthUnlockedAt).getTime();
    if (!Number.isFinite(gateStartMs) || now < gateStartMs + TWENTY_EIGHT_DAYS_MS) break;

    const nextMonth = currentMonth + 1;
    const nextUnlockedIso = new Date().toISOString();

    const { error: upErr } = await admin
      .from("blueprints")
      .update({
        current_month: nextMonth,
        month_unlocked_at: nextUnlockedIso,
        updated_at: nextUnlockedIso,
      })
      .eq("id", blueprint.id);
    if (upErr) throw new Error(upErr.message);

    currentMonth = nextMonth;
    monthUnlockedAt = nextUnlockedIso;
    updated = true;
    advancedToMonth = nextMonth;
    theme = getProgramMonthThemeTitle(nextMonth);

    // Fire month unlock email — non-blocking, don't throw on failure
    void (async () => {
      try {
        const { data: clientRow } = await admin
          .from("clients")
          .select("email, full_name")
          .eq("id", userId)
          .maybeSingle();
        if (clientRow?.email) {
          const unsubscribeUrl = generateUnsubscribeUrl(userId);
          await sendMonthUnlockEmail(clientRow.email, clientRow.full_name ?? "", nextMonth, unsubscribeUrl);
        }
      } catch {
        // Non-critical — swallow error
      }
    })();

    if (nextMonth >= 2 && nextMonth <= MAX_THEMED_PROGRAM_MONTH) {
      await ensureMonthlyPlanRow(admin, {
        clientId: userId,
        blueprintId: blueprint.id,
        programMonth: nextMonth,
        rawParseData: blueprint.raw_parse_data,
        completions,
        preserveUnlockedAt: nextUnlockedIso,
      });
    }

    // Re-fetch completions in case nothing changed (same array ok for next loop)
    if (nextMonth >= 5) break;
  }

  return { updated, advancedToMonth, theme };
}

/** After a new bureau parse: refresh Claude plan for the client’s current themed month (2–4) only. */
export async function regenerateCurrentMonthlyPlanAfterBureauUpdate(
  admin: SupabaseClient,
  userId: string,
  blueprintId: string,
): Promise<void> {
  const { data: bp, error } = await admin
    .from("blueprints")
    .select("id, client_id, current_month, raw_parse_data")
    .eq("id", blueprintId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!bp?.id) return;

  const currentMonth = normalizeProgramMonth(bp.current_month as number | null);
  if (currentMonth < 2 || currentMonth > MAX_THEMED_PROGRAM_MONTH) return;

  const { data: planRow } = await admin
    .from("monthly_plans")
    .select("unlocked_at")
    .eq("blueprint_id", blueprintId)
    .eq("month_number", currentMonth)
    .maybeSingle();

  const completions = await fetchCompletions(admin, userId, blueprintId);
  const preserveUnlockedAt =
    planRow && typeof (planRow as { unlocked_at?: string }).unlocked_at === "string"
      ? (planRow as { unlocked_at: string }).unlocked_at
      : null;

  await ensureMonthlyPlanRow(admin, {
    clientId: userId,
    blueprintId,
    programMonth: currentMonth,
    rawParseData: bp.raw_parse_data,
    completions,
    preserveUnlockedAt,
  });
}
