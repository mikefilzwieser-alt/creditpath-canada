import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

const MRR_PER_CLIENT = 8.88;

type Body = { portal_password?: string };

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** Monday 00:00 local time for the week containing `d`. */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
}

function normalizeProgramMonth(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
  return 1;
}

function blueprintHasData(data: unknown): boolean {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return false;
  return Object.keys(data as object).length > 0;
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

  const { data: clients, error: cErr } = await admin
    .from("clients")
    .select("id, full_name, email, subscription_status, free_trial, created_at, updated_at, applied_promo_code")
    .order("created_at", { ascending: false });

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 400 });
  }

  const list = clients ?? [];
  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeekMonday(now);

  let activeTotal = 0;
  let trialTotal = 0;
  let signupsWeek = 0;
  let signupsMonth = 0;
  let cancelledMonth = 0;
  let promoTotal = 0;

  for (const c of list) {
    const status = String((c as { subscription_status?: string | null }).subscription_status ?? "").toLowerCase();
    if (status === "active") activeTotal += 1;
    if (Boolean((c as { free_trial?: boolean }).free_trial)) trialTotal += 1;

    const created = (c as { created_at?: string }).created_at;
    if (created) {
      const cd = new Date(created);
      if (!Number.isNaN(cd.getTime())) {
        if (cd >= weekStart) signupsWeek += 1;
        if (cd >= monthStart) signupsMonth += 1;
      }
    }

    if (status === "cancelled") {
      const upd = (c as { updated_at?: string }).updated_at;
      if (upd) {
        const ud = new Date(upd);
        if (!Number.isNaN(ud.getTime()) && ud >= monthStart) cancelledMonth += 1;
      }
    }

    const promo = (c as { applied_promo_code?: string | null }).applied_promo_code;
    if (typeof promo === "string" && promo.trim().length > 0) promoTotal += 1;
  }

  const mrr = Math.round(activeTotal * MRR_PER_CLIENT * 100) / 100;

  const ids = list.map((c) => c.id as string).filter(Boolean);
  const lastSignInById = new Map<string, string | null>();

  if (ids.length > 0) {
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
  }

  if (ids.length === 0) {
    return NextResponse.json({
      ok: true,
      founder: {
        active_total: 0,
        mrr: 0,
        trial_total: 0,
        signups_week: 0,
        signups_month: 0,
        cancelled_month: 0,
        promo_usage: 0,
      },
      ops: [],
    });
  }

  const { data: bps, error: bErr } = await admin
    .from("blueprints")
    .select("id, client_id, status, blueprint_data, raw_parse_data, created_at, updated_at, current_month")
    .in("client_id", ids)
    .order("created_at", { ascending: false });

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 400 });
  }

  const latestByClient = new Map<
    string,
    {
      id: string;
      created_at: string;
      updated_at: string;
      current_month: number;
      blueprint_data: unknown;
    }
  >();

  for (const row of bps ?? []) {
    const cid = row.client_id as string;
    if (!cid || latestByClient.has(cid)) continue;
    latestByClient.set(cid, {
      id: String(row.id ?? ""),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? row.created_at ?? ""),
      current_month: normalizeProgramMonth((row as { current_month?: number | null }).current_month),
      blueprint_data: row.blueprint_data,
    });
  }

  const blueprintIds = [...latestByClient.values()]
    .map((v) => v.id)
    .filter((id) => id.length > 0);

  const currentMonthByBlueprintId = new Map<string, number>();
  for (const v of latestByClient.values()) {
    if (v.id) currentMonthByBlueprintId.set(v.id, v.current_month);
  }

  const completionsThisMonthByBlueprint = new Map<string, number>();
  if (blueprintIds.length > 0) {
    const { data: compRows, error: compErr } = await admin
      .from("action_completions")
      .select("blueprint_id, program_month")
      .in("blueprint_id", blueprintIds);
    if (!compErr && compRows) {
      for (const r of compRows) {
        const bid = String((r as { blueprint_id?: string }).blueprint_id ?? "");
        const pm = (r as { program_month?: number }).program_month;
        if (!bid) continue;
        const targetMonth = currentMonthByBlueprintId.get(bid) ?? 1;
        if (typeof pm === "number" && Math.floor(pm) === targetMonth) {
          completionsThisMonthByBlueprint.set(bid, (completionsThisMonthByBlueprint.get(bid) ?? 0) + 1);
        }
      }
    }
  }

  type OpsRow = {
    id: string;
    full_name: string | null;
    subscription_status: string | null;
    current_month: number | null;
    last_bureau_at: string | null;
    last_login_at: string | null;
    blueprint_generated: boolean;
    actions_completed_this_month: number;
    stuck_month1: boolean;
    sort_ts: number;
  };

  const opsRows: OpsRow[] = list.map((c) => {
    const id = c.id as string;
    const bp = latestByClient.get(id);
    const currentMonth = bp?.current_month ?? null;
    const lastBureau = bp?.updated_at ?? null;
    const lastLogin = lastSignInById.get(id) ?? null;
    const blueprintGenerated = bp ? blueprintHasData(bp.blueprint_data) : false;
    const actionsThisMonth = bp?.id ? (completionsThisMonthByBlueprint.get(bp.id) ?? 0) : 0;

    const createdBp = bp?.created_at ? new Date(bp.created_at) : null;
    const daysOnProgram =
      createdBp && !Number.isNaN(createdBp.getTime())
        ? Math.floor((now.getTime() - createdBp.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
    const stuckMonth1 = currentMonth === 1 && daysOnProgram >= 45;

    const tLogin = lastLogin ? new Date(lastLogin).getTime() : 0;
    const tBp = bp?.updated_at ? new Date(bp.updated_at).getTime() : 0;
    const tClient = (c as { updated_at?: string }).updated_at
      ? new Date((c as { updated_at: string }).updated_at).getTime()
      : 0;
    const sortTs = Math.max(tLogin, tBp, tClient);

    return {
      id,
      full_name: (c as { full_name?: string | null }).full_name ?? null,
      subscription_status: (c as { subscription_status?: string | null }).subscription_status ?? null,
      current_month: currentMonth,
      last_bureau_at: lastBureau,
      last_login_at: lastLogin,
      blueprint_generated: blueprintGenerated,
      actions_completed_this_month: actionsThisMonth,
      stuck_month1: stuckMonth1,
      sort_ts: sortTs,
    };
  });

  opsRows.sort((a, b) => b.sort_ts - a.sort_ts);

  const opsRowsOut = opsRows.map(({ sort_ts, ...rest }) => {
    void sort_ts;
    return rest;
  });

  return NextResponse.json({
    ok: true,
    founder: {
      active_total: activeTotal,
      mrr,
      trial_total: trialTotal,
      signups_week: signupsWeek,
      signups_month: signupsMonth,
      cancelled_month: cancelledMonth,
      promo_usage: promoTotal,
    },
    ops: opsRowsOut,
  });
}
