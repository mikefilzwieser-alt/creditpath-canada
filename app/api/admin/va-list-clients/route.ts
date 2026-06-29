import { NextResponse } from "next/server";
import {
  computeSeverityAdjustedRebuildScore,
  equifaxScoreFromParsed,
  getDisplayedTopActionsCount,
  utilizationPercent,
  type BlueprintPlanLite,
  type ParsedBureauLite,
} from "@/lib/goals-milestone-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

const STALE_BUREAU_DAYS = 60;

type Body = {
  portal_password?: string;
  assigned_va?: string | null;
};

function normalizeProgramMonth(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
  return 1;
}

function latestIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const rawAt = a ? new Date(a).getTime() : 0;
  const rawBt = b ? new Date(b).getTime() : 0;
  const at = Number.isFinite(rawAt) ? rawAt : 0;
  const bt = Number.isFinite(rawBt) ? rawBt : 0;
  if (at <= 0 && bt <= 0) return null;
  return bt > at ? (b ?? null) : (a ?? null);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isValidVaPortalPassword(body.portal_password)) {
    return NextResponse.json({ error: "Invalid VA portal password." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for admin database access." }, { status: 503 });
  }

  const vaFilter = typeof body.assigned_va === "string" ? body.assigned_va.trim() : "";
  let query = admin
    .from("clients")
    .select("id, full_name, email, phone, primary_goal, assigned_va, created_at, free_trial, subscription_status, goals");
  if (vaFilter) {
    query = query.eq("assigned_va", vaFilter);
  }
  const { data: clients, error: cErr } = await query.order("created_at", { ascending: false });
  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 400 });
  }

  const list = clients ?? [];
  const ids = list.map((c) => c.id as string).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: {
        active_clients: 0,
        trial_clients: 0,
        cancelled_clients: 0,
        stale_bureau_count: 0,
        graduation_ready_count: 0,
      },
      clients: [],
    });
  }

  const lastSignInById = new Map<string, string | null>();
  const chunkSize = 40;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (uid) => {
        const { data, error } = await admin.auth.admin.getUserById(uid);
        if (!error && data?.user) {
          lastSignInById.set(uid, data.user.last_sign_in_at ?? null);
        }
      }),
    );
  }

  const { data: bps, error: bErr } = await admin
    .from("blueprints")
    .select("id, client_id, status, blueprint_data, raw_parse_data, created_at, current_month, bureau_uploaded_at")
    .in("client_id", ids)
    .order("created_at", { ascending: false });

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 400 });
  }

  const latestByClient = new Map<
    string,
    {
      id: string;
      status: string;
      blueprint_data: unknown;
      raw_parse_data: unknown;
      created_at: string;
      current_month: number;
      bureau_uploaded_at: string | null;
    }
  >();
  for (const row of bps ?? []) {
    const cid = row.client_id as string;
    if (!latestByClient.has(cid)) {
      latestByClient.set(cid, {
        id: String(row.id ?? ""),
        status: String(row.status ?? "—"),
        blueprint_data: row.blueprint_data,
        raw_parse_data: row.raw_parse_data,
        created_at: String(row.created_at ?? ""),
        current_month: normalizeProgramMonth((row as { current_month?: number | null }).current_month),
        bureau_uploaded_at:
          typeof (row as { bureau_uploaded_at?: string | null }).bureau_uploaded_at === "string"
            ? (row as { bureau_uploaded_at: string }).bureau_uploaded_at
            : null,
      });
    }
  }

  const blueprintIds = [...latestByClient.values()]
    .map((v) => v.id)
    .filter((id) => id.length > 0);

  const completionCountByBlueprint = new Map<string, number>();
  const latestCompletionByClient = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: compRows, error: compErr } = await admin
      .from("action_completions")
      .select("client_id, blueprint_id, completed_at")
      .in("client_id", ids);
    if (!compErr && compRows) {
      for (const r of compRows) {
        const bid = String((r as { blueprint_id?: string }).blueprint_id ?? "");
        if (bid && blueprintIds.includes(bid)) {
          completionCountByBlueprint.set(bid, (completionCountByBlueprint.get(bid) ?? 0) + 1);
        }
        const cid = String((r as { client_id?: string }).client_id ?? "");
        const completedAt = (r as { completed_at?: string | null }).completed_at ?? null;
        if (cid && completedAt) {
          latestCompletionByClient.set(cid, latestIso(latestCompletionByClient.get(cid), completedAt));
        }
      }
    }
  }

  const now = Date.now();
  const rows = list.map((c) => {
    const bp = latestByClient.get(c.id as string);
    const bd = (bp?.blueprint_data ?? null) as Record<string, unknown> | null;
    const readiness =
      bd && typeof bd.readiness_percentage === "number" && Number.isFinite(bd.readiness_percentage)
        ? Math.round(bd.readiness_percentage)
        : null;
    const autoReady = Boolean(bd?.auto_ready_alert);
    const parsed = (bp?.raw_parse_data ?? null) as ParsedBureauLite | null;
    const plan = (bp?.blueprint_data ?? null) as BlueprintPlanLite | null;
    const equifax = equifaxScoreFromParsed(parsed);
    const equifaxForRebuild = equifax ?? 0;
    const rebuildScore = Math.round(
      computeSeverityAdjustedRebuildScore(plan?.rebuild_score, parsed, equifaxForRebuild),
    );
    const utilPct = utilizationPercent(parsed);
    const topActionsCount = getDisplayedTopActionsCount(plan, parsed);
    const blueprintId = bp?.id?.length ? bp.id : null;
    const actionsCompleted =
      blueprintId !== null ? (completionCountByBlueprint.get(blueprintId) ?? 0) : 0;
    const currentMonth = bp?.current_month ?? null;
    const bureauUploadedAt = bp?.bureau_uploaded_at ?? null;
    const bureauUploadedMs = bureauUploadedAt ? new Date(bureauUploadedAt).getTime() : null;
    const staleBureau =
      bureauUploadedMs === null ||
      !Number.isFinite(bureauUploadedMs) ||
      now - bureauUploadedMs > STALE_BUREAU_DAYS * 24 * 60 * 60 * 1000;
    const graduationReady = (readiness !== null && readiness >= 75) || (currentMonth !== null && currentMonth >= 22);
    const cid = c.id as string;
    const lastActivity = latestIso(lastSignInById.get(cid), latestCompletionByClient.get(cid));

    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      primary_goal: c.primary_goal,
      assigned_va: c.assigned_va,
      client_created_at: c.created_at,
      free_trial: Boolean((c as { free_trial?: boolean }).free_trial),
      subscription_status: (c as { subscription_status?: string | null }).subscription_status ?? null,
      goals: (c as { goals?: unknown }).goals ?? null,
      blueprint_id: blueprintId,
      blueprint_status: bp?.status ?? "—",
      blueprint_created_at: bp?.created_at ?? null,
      bureau_uploaded_at: bureauUploadedAt,
      current_month: currentMonth,
      readiness_percentage: readiness,
      auto_ready_alert: autoReady,
      equifax_score: equifax,
      rebuild_score: rebuildScore,
      utilization_percentage: utilPct,
      top_actions_count: topActionsCount,
      actions_completed: actionsCompleted,
      last_activity: lastActivity,
      stale_bureau: staleBureau,
      graduation_ready: graduationReady,
    };
  });

  const summary = rows.reduce(
    (acc, row) => {
      const status = String(row.subscription_status ?? "").toLowerCase();
      if (status === "active") acc.active_clients += 1;
      if (status === "trial") acc.trial_clients += 1;
      if (status === "cancelled") acc.cancelled_clients += 1;
      if (row.stale_bureau) acc.stale_bureau_count += 1;
      if (row.graduation_ready) acc.graduation_ready_count += 1;
      return acc;
    },
    {
      active_clients: 0,
      trial_clients: 0,
      cancelled_clients: 0,
      stale_bureau_count: 0,
      graduation_ready_count: 0,
    },
  );

  return NextResponse.json({ ok: true, summary, clients: rows });
}
