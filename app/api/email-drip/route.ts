import { NextResponse } from "next/server";
import { Resend } from "resend";
import { wrapCpcEmailHtml, escapeHtml } from "@/lib/email-layout-cpc";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function utcDayDiff(fromIso: string, toDate: Date): number {
  const from = new Date(fromIso);
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function firstNameFromMeta(meta: Record<string, unknown> | undefined, email: string): string {
  const full = meta?.full_name;
  if (typeof full === "string" && full.trim()) {
    return full.trim().split(/\s+/)[0] ?? "there";
  }
  const first = meta?.first_name;
  if (typeof first === "string" && first.trim()) return first.trim();
  if (email.includes("@")) return email.split("@")[0] ?? "there";
  return "there";
}

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? process.env.EMAIL_DRIP_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  return runDrip(request);
}

export async function POST(request: Request) {
  return runDrip(request);
}

async function runDrip(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  if (!apiKey) {
    console.error("[email-drip] RESEND_API_KEY missing");
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not configured." }, { status: 503 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[email-drip] Supabase admin client unavailable");
    return NextResponse.json({ ok: false, error: "Admin client unavailable." }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const now = new Date();
  const log: Record<string, unknown> = { at: now.toISOString(), brandon: [] as unknown[], eq: [] as unknown[] };

  const { data: clients, error: listErr } = await admin
    .from("clients")
    .select("id, created_at, email_drip_brandon_day3_sent_at, email_drip_eq_day7_sent_at");

  if (listErr) {
    console.error("[email-drip] clients select failed", listErr.message);
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  for (const row of clients ?? []) {
    const id = row.id as string;
    const createdAt = row.created_at as string;
    const dayDiff = utcDayDiff(createdAt, now);

    if (dayDiff === 3 && !row.email_drip_brandon_day3_sent_at) {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(id);
      if (userErr || !userData?.user?.email) {
        (log.brandon as unknown[]).push({ id, ok: false, reason: userErr?.message ?? "no email" });
        continue;
      }
      const email = userData.user.email;
      const name = firstNameFromMeta(userData.user.user_metadata as Record<string, unknown>, email);
      const inner = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>As a Credit Path Canada member you have access to a free financial planning session with Brandon Kirk — a licensed financial specialist and our trusted partner at Safe Wealth Planners.</p>
    <p>A lot of our clients find this session incredibly valuable — especially early in the program when you&apos;re mapping out your full financial picture.</p>
    <p>No cost. No obligation. Just a conversation with someone who can help.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="https://calendly.com/brandonkirk/" style="background:#00C9A7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Book Your Free Session →</a>
    </p>
    <p>— Michael Filzwieser<br><span style="color: #888; font-size: 13px;">Founder, Credit Path Canada</span></p>`;
      const html = wrapCpcEmailHtml("A free resource for Credit Path Canada members", inner);
      const { error: sendErr } = await resend.emails.send({
        from,
        to: [email],
        subject: "A free resource for Credit Path Canada members",
        html,
      });
      if (sendErr) {
        console.error("[email-drip] brandon send failed", id, sendErr.message);
        (log.brandon as unknown[]).push({ id, ok: false, error: sendErr.message });
        continue;
      }
      const { error: upErr } = await admin
        .from("clients")
        .update({ email_drip_brandon_day3_sent_at: now.toISOString() })
        .eq("id", id);
      if (upErr) {
        console.error("[email-drip] brandon flag update failed", id, upErr.message);
        (log.brandon as unknown[]).push({ id, ok: true, sent: true, flagError: upErr.message });
      } else {
        (log.brandon as unknown[]).push({ id, ok: true, sent: true });
      }
    }

    if (dayDiff === 7 && !row.email_drip_eq_day7_sent_at) {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(id);
      if (userErr || !userData?.user?.email) {
        (log.eq as unknown[]).push({ id, ok: false, reason: userErr?.message ?? "no email" });
        continue;
      }
      const email = userData.user.email;
      const name = firstNameFromMeta(userData.user.user_metadata as Record<string, unknown>, email);
      const inner = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>One of the most effective tools for building credit history is having a card that reports to both Equifax and TransUnion. EQ Bank's card does exactly that — with no credit check required.</p>
    <p>It takes 5 minutes to apply and could be one of the highest-impact moves you make this month.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="https://join.eqbank.ca/?code=MICHAEL1577" style="background:#00C9A7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Get EQ Bank Card →</a>
    </p>
    <p>— Michael Filzwieser<br><span style="color: #888; font-size: 13px;">Founder, Credit Path Canada</span></p>`;
      const html = wrapCpcEmailHtml("One of the fastest ways to build your credit history", inner);
      const { error: sendErr } = await resend.emails.send({
        from,
        to: [email],
        subject: "One of the fastest ways to build your credit history",
        html,
      });
      if (sendErr) {
        console.error("[email-drip] eq send failed", id, sendErr.message);
        (log.eq as unknown[]).push({ id, ok: false, error: sendErr.message });
        continue;
      }
      const { error: upErr } = await admin
        .from("clients")
        .update({ email_drip_eq_day7_sent_at: now.toISOString() })
        .eq("id", id);
      if (upErr) {
        console.error("[email-drip] eq flag update failed", id, upErr.message);
        (log.eq as unknown[]).push({ id, ok: true, sent: true, flagError: upErr.message });
      } else {
        (log.eq as unknown[]).push({ id, ok: true, sent: true });
      }
    }
  }

  console.log("[email-drip] run complete", JSON.stringify(log));
  return NextResponse.json({ ok: true, ...log });
}
