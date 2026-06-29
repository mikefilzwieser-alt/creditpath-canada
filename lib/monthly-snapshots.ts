import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateMonthsClean } from "@/lib/calculate-months-clean";

export type MonthlySnapshotRow = {
  id: string;
  client_id: string;
  blueprint_id: string;
  program_month: number;
  on_track: boolean;
  streak_count: number;
  actions_completed_total: number;
  months_clean: number;
  equifax_score: number | null;
  created_at: string;
};

type LatestBlueprintRow = {
  id: string;
  raw_parse_data: unknown;
  created_at: string;
};

type PriorSnapshotRow = {
  streak_count?: number | null;
};

function normalizeProgramMonth(programMonth: number): number {
  if (!Number.isFinite(programMonth)) {
    throw new Error("programMonth must be a finite number.");
  }
  const normalized = Math.floor(programMonth);
  if (normalized < 1) {
    throw new Error("programMonth must be greater than or equal to 1.");
  }
  return normalized;
}

function extractEquifaxScore(rawParseData: unknown): number | null {
  if (!rawParseData || typeof rawParseData !== "object") return null;
  const raw = rawParseData as {
    equifax_score?: unknown;
    score?: { equifax_score?: unknown };
  };
  const value = typeof raw.equifax_score === "number" ? raw.equifax_score : raw.score?.equifax_score;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
}

async function fetchLatestBlueprint(admin: SupabaseClient, clientId: string): Promise<LatestBlueprintRow> {
  const { data, error } = await admin
    .from("blueprints")
    .select("id, raw_parse_data, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("No blueprint found for client.");
  return data as LatestBlueprintRow;
}

async function fetchPriorSnapshot(
  admin: SupabaseClient,
  clientId: string,
  programMonth: number,
): Promise<PriorSnapshotRow | null> {
  if (programMonth <= 1) return null;
  const { data, error } = await admin
    .from("monthly_snapshots")
    .select("streak_count")
    .eq("client_id", clientId)
    .eq("program_month", programMonth - 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as PriorSnapshotRow | null;
}

async function fetchCompletionRows(
  admin: SupabaseClient,
  clientId: string,
  programMonth: number,
): Promise<Array<{ program_month?: number | null; action_index?: number | null }>> {
  const { data, error } = await admin
    .from("action_completions")
    .select("program_month, action_index")
    .eq("client_id", clientId)
    .lte("program_month", programMonth);

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ program_month?: number | null; action_index?: number | null }>;
}

function isMonthOnTrack(
  completions: Array<{ program_month?: number | null; action_index?: number | null }>,
  programMonth: number,
): boolean {
  const indexes = new Set<number>();
  for (const row of completions) {
    if (row.program_month !== programMonth) continue;
    if (typeof row.action_index === "number" && Number.isFinite(row.action_index)) {
      indexes.add(row.action_index);
    }
  }
  return indexes.has(0) && indexes.has(1) && indexes.has(2);
}

export async function writeMonthlySnapshot(
  admin: SupabaseClient,
  clientId: string,
  programMonthRaw: number,
): Promise<MonthlySnapshotRow> {
  const clientIdTrimmed = clientId.trim();
  if (!clientIdTrimmed) throw new Error("clientId is required.");

  const programMonth = normalizeProgramMonth(programMonthRaw);
  const blueprint = await fetchLatestBlueprint(admin, clientIdTrimmed);
  const priorSnapshot = await fetchPriorSnapshot(admin, clientIdTrimmed, programMonth);
  const completions = await fetchCompletionRows(admin, clientIdTrimmed, programMonth);

  const onTrack = isMonthOnTrack(completions, programMonth);
  const priorStreak = Math.max(0, Math.floor(priorSnapshot?.streak_count ?? 0));
  const streakCount = onTrack ? priorStreak + 1 : 0;
  const monthsClean = calculateMonthsClean(blueprint.created_at);
  const actionsCompletedTotal = completions.length;
  const equifaxScore = extractEquifaxScore(blueprint.raw_parse_data);

  const { data, error } = await admin
    .from("monthly_snapshots")
    .upsert(
      {
        client_id: clientIdTrimmed,
        blueprint_id: blueprint.id,
        program_month: programMonth,
        on_track: onTrack,
        streak_count: streakCount,
        actions_completed_total: actionsCompletedTotal,
        months_clean: monthsClean,
        equifax_score: equifaxScore,
      },
      { onConflict: "client_id,program_month" },
    )
    .select(
      "id, client_id, blueprint_id, program_month, on_track, streak_count, actions_completed_total, months_clean, equifax_score, created_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return data as MonthlySnapshotRow;
}
