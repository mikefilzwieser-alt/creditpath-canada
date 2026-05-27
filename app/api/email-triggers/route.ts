import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendBrandonEmail } from "@/lib/send-brandon-email";
import { sendReengagementEmail } from "@/lib/send-reengagement-email";
import { sendDay14Email } from "@/lib/send-day14-email";
import { sendBureauRefreshEmail } from "@/lib/send-bureau-refresh-email";

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.EMAIL_TRIGGER_SECRET;

  if (!isVercelCron && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return POST(request);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.EMAIL_TRIGGER_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Admin unavailable" }, { status: 500 });

  const now = new Date();
  const results = { brandon: 0, reengagement: 0, day14: 0, bureauRefresh: 0 };

  const { data: clients } = await admin
    .from("clients")
    .select("id, full_name, email, subscription_status, free_trial, trial_start, created_at, last_login_at, brandon_email_sent, reengagement_email_sent, day14_email_sent, bureau_refresh_email_sent, last_bureau_at")
    .in("subscription_status", ["active", "trial"]);

  if (!clients) return NextResponse.json({ error: "No clients" }, { status: 500 });

  for (const client of clients) {
    if (!client.email) continue;
    const createdAt = new Date(client.created_at);
    const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const lastLogin = client.last_login_at ? new Date(client.last_login_at) : null;
    const daysSinceLogin = lastLogin
      ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreated;

    // Brandon email — Day 3+, not yet sent
    if (daysSinceCreated >= 3 && !client.brandon_email_sent) {
      const result = await sendBrandonEmail(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ brandon_email_sent: true }).eq("id", client.id);
        results.brandon++;
      }
    }

    // Day 14 check-in — Day 14+, not yet sent
    if (daysSinceCreated >= 14 && !client.day14_email_sent) {
      const result = await sendDay14Email(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ day14_email_sent: true }).eq("id", client.id);
        results.day14++;
      }
    }

    // Re-engagement — 21+ days no login, not yet sent
    if (daysSinceLogin >= 21 && !client.reengagement_email_sent) {
      const result = await sendReengagementEmail(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ reengagement_email_sent: true }).eq("id", client.id);
        results.reengagement++;
      }
    }

    // Bureau refresh — 110+ days since last bureau upload, not yet sent
    const lastBureau = client.last_bureau_at ? new Date(client.last_bureau_at) : null;
    const daysSinceBureau = lastBureau
      ? Math.floor((now.getTime() - lastBureau.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    if (daysSinceBureau !== null && daysSinceBureau >= 110 && !client.bureau_refresh_email_sent) {
      const result = await sendBureauRefreshEmail(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ bureau_refresh_email_sent: true }).eq("id", client.id);
        results.bureauRefresh++;
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
