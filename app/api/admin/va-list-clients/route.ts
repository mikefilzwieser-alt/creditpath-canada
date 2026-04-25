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

type Body = {
  portal_password?: string;
  assigned_va?: string | null;
};

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
    return NextResponse.json({ ok: true, clients: [] });
  }

  const { data: bps, error: bErr } = await admin
    .from("blueprints")
    .select("id, client_id, status, blueprint_data, raw_parse_data, created_at")
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
      });
    }
  }

  const blueprintIds = [...latestByClient.values()]
    .map((v) => v.id)
    .filter((id) => id.length > 0);

  const completionCountByBlueprint = new Map<string, number>();
  if (blueprintIds.length > 0) {
    const { data: compRows, error: compErr } = await admin
      .from("action_completions")
      .select("blueprint_id")
      .in("blueprint_id", blueprintIds);
    if (!compErr && compRows) {
      for (const r of compRows) {
        const bid = String((r as { blueprint_id?: string }).blueprint_id ?? "");
        if (!bid) continue;
        completionCountByBlueprint.set(bid, (completionCountByBlueprint.get(bid) ?? 0) + 1);
      }
    }
  }

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
      readiness_percentage: readiness,
      auto_ready_alert: autoReady,
      equifax_score: equifax,
      rebuild_score: rebuildScore,
      utilization_percentage: utilPct,
      top_actions_count: topActionsCount,
      actions_completed: actionsCompleted,
    };
  });

  return NextResponse.json({ ok: true, clients: rows });
}
