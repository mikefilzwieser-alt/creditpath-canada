import { NextResponse } from "next/server";
import { sendMonthCompleteEmail } from "@/lib/send-month-complete-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe-token";

export const runtime = "nodejs";

type CompletionPayload = {
  blueprintId: string;
  programMonth: number;
  actionIndex: number;
  actionText?: string;
  completed: boolean;
};

function allThreeDone(rows: Array<{ action_index?: number | null }>): boolean {
  const indexes = new Set<number>();
  for (const row of rows) {
    if (typeof row.action_index === "number" && Number.isFinite(row.action_index)) {
      indexes.add(row.action_index);
    }
  }
  return indexes.has(0) && indexes.has(1) && indexes.has(2);
}

function firstNameFromMetadata(fullName: string | undefined, email: string): string {
  const fromName = typeof fullName === "string" ? fullName.trim() : "";
  if (fromName) {
    return fromName.split(/\s+/)[0] ?? "there";
  }
  const local = email.split("@")[0]?.trim();
  return local || "there";
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!accessToken || !authHeader) {
    return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server database not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken);
  if (userError || !user) {
    return NextResponse.json({ error: userError?.message ?? "Invalid session." }, { status: 401 });
  }

  const payload = (await request.json()) as CompletionPayload;
  const blueprintId = typeof payload.blueprintId === "string" ? payload.blueprintId.trim() : "";
  const programMonth = Number(payload.programMonth);
  const actionIndex = Number(payload.actionIndex);
  const actionText = typeof payload.actionText === "string" ? payload.actionText : "";
  const completed = Boolean(payload.completed);

  if (!blueprintId || !Number.isFinite(programMonth) || !Number.isFinite(actionIndex)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data: blueprintRow, error: blueprintErr } = await admin
    .from("blueprints")
    .select("id, month_unlocked_at, created_at")
    .eq("id", blueprintId)
    .eq("client_id", user.id)
    .maybeSingle();
  if (blueprintErr) {
    return NextResponse.json({ error: blueprintErr.message }, { status: 500 });
  }
  if (!blueprintRow?.id) {
    return NextResponse.json({ error: "Blueprint not found." }, { status: 404 });
  }

  const match = {
    client_id: user.id,
    blueprint_id: blueprintId,
    program_month: programMonth,
    action_index: actionIndex,
  };

  const { data: beforeRows, error: beforeErr } = await admin
    .from("action_completions")
    .select("action_index")
    .eq("client_id", user.id)
    .eq("blueprint_id", blueprintId)
    .eq("program_month", programMonth);
  if (beforeErr) {
    return NextResponse.json({ error: beforeErr.message }, { status: 500 });
  }
  const wasAllDone = allThreeDone((beforeRows ?? []) as Array<{ action_index?: number | null }>);

  if (completed) {
    const completedAt = new Date().toISOString();
    const { data: existingRow, error: selectErr } = await admin
      .from("action_completions")
      .select("id")
      .match(match)
      .maybeSingle();
    if (selectErr) {
      return NextResponse.json({ error: selectErr.message }, { status: 500 });
    }
    const rowId = (existingRow as { id?: string } | null)?.id;
    const { error: saveErr } = await admin
      .from("action_completions")
      .upsert(
        { ...match, action_text: actionText, completed_at: completedAt },
        { onConflict: "client_id,blueprint_id,program_month,action_index" },
      );
    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }
  } else {
    const { error: delErr } = await admin
      .from("action_completions")
      .delete()
      .eq("client_id", user.id)
      .eq("blueprint_id", blueprintId)
      .eq("program_month", programMonth)
      .eq("action_index", actionIndex);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  }

  const { data: afterRows, error: afterErr } = await admin
    .from("action_completions")
    .select("action_index")
    .eq("client_id", user.id)
    .eq("blueprint_id", blueprintId)
    .eq("program_month", programMonth);
  if (afterErr) {
    return NextResponse.json({ error: afterErr.message }, { status: 500 });
  }
  const isAllDone = allThreeDone((afterRows ?? []) as Array<{ action_index?: number | null }>);

  if (completed && !wasAllDone && isAllDone) {
    const unlockedAtIso = blueprintRow.month_unlocked_at ?? blueprintRow.created_at;
    const unlockedAtMs = new Date(unlockedAtIso).getTime();
    const elapsedDays = Number.isFinite(unlockedAtMs)
      ? Math.max(0, Math.floor((Date.now() - unlockedAtMs) / (24 * 60 * 60 * 1000)))
      : 0;
    const daysRemaining = Math.max(0, 28 - elapsedDays);
    const month = Math.max(1, Math.floor(programMonth));
    const nextMonth = month + 1;

    if (user.email) {
      const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
      const name = firstNameFromMetadata(fullName, user.email);
      const unsubscribeUrl = generateUnsubscribeUrl(user.id);
      await sendMonthCompleteEmail(user.email, { name, month, nextMonth, daysRemaining, unsubscribeUrl });
    }
  }

  return NextResponse.json({ ok: true, allCurrentMonthActionsDone: isAllDone });
}
