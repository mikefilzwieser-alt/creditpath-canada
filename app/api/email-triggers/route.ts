import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendBrandonEmail } from "@/lib/send-brandon-email";
import { sendReengagementEmail } from "@/lib/send-reengagement-email";
import { sendDay14Email } from "@/lib/send-day14-email";
import { sendBureauRefreshEmail } from "@/lib/send-bureau-refresh-email";

async function runEmailTriggers() {
  try {
  console.log("[email-triggers] starting, checking admin...");
  console.log("[email-triggers] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing");
  console.log("[email-triggers] SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing");
  const admin = getSupabaseAdmin();
  console.log("[email-triggers] admin:", admin ? "ready" : "null");
  if (!admin) return NextResponse.json({ error: "Admin unavailable" }, { status: 500 });

  const now = new Date();
  const results = { brandon: 0, reengagement: 0, day14: 0, bureauRefresh: 0 };

  const { data: clients, error } = await admin
    .from("clients")
    .select("id, full_name, email, subscription_status, created_at, last_login_at, brandon_email_sent, reengagement_email_sent, day14_email_sent, bureau_refresh_email_sent")
    .in("subscription_status", ["active", "trial"]);

  console.log("[email-triggers] query error:", error?.message ?? "none");
  console.log("[email-triggers] clients count:", clients?.length ?? "null");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!clients) return NextResponse.json({ error: "No clients" }, { status: 500 });
  console.log("[email-triggers] starting loop...");

  for (const client of clients) {
    if (!client.email) continue;
    const createdAt = new Date(client.created_at);
    const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const lastLogin = client.last_login_at ? new Date(client.last_login_at) : null;
    const daysSinceLogin = lastLogin
      ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreated;

    if (daysSinceCreated >= 3 && !client.brandon_email_sent) {
      const result = await sendBrandonEmail(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ brandon_email_sent: true }).eq("id", client.id);
        results.brandon++;
      }
    }

    if (daysSinceCreated >= 14 && !client.day14_email_sent) {
      const result = await sendDay14Email(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ day14_email_sent: true }).eq("id", client.id);
        results.day14++;
      }
    }

    if (daysSinceLogin >= 21 && !client.reengagement_email_sent) {
      const result = await sendReengagementEmail(client.email, client.full_name ?? "");
      if (result.sent) {
        await admin.from("clients").update({ reengagement_email_sent: true }).eq("id", client.id);
        results.reengagement++;
      }
    }
  }

  return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[email-triggers] crash:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return runEmailTriggers();
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.EMAIL_TRIGGER_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runEmailTriggers();
}
