import { NextResponse } from "next/server";
import { verifyUnsubscribeSignature } from "@/lib/unsubscribe-token";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function confirmationHtml(already: boolean): string {
  const title = already ? "Already unsubscribed" : "You're unsubscribed";
  const body = already
    ? "This address is already opted out of promotional emails from Credit Path Canada. You may still receive important service emails about your account."
    : "You've been unsubscribed from promotional emails from Credit Path Canada. You may still receive important service emails about your account (login details, blueprint updates, and program milestones).";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Credit Path Canada</title>
</head>
<body style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;background:#F8F6F1;margin:0;padding:40px 20px;color:#0F1923;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px 28px;box-shadow:0 4px 24px rgba(15,25,35,0.08);">
    <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;margin-bottom:16px;"></div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${title}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4B5563;">${body}</p>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color:#00C9A7;">creditpathcanada.ca</a></p>
  </div>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Unsubscribe — Credit Path Canada</title></head>
<body style="font-family:'Segoe UI',sans-serif;background:#F8F6F1;margin:0;padding:40px 20px;color:#0F1923;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 28px;">
    <h1 style="margin:0 0 12px;font-size:20px;">Unable to unsubscribe</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#4B5563;">${message}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("id")?.trim() ?? "";
  const sig = searchParams.get("sig")?.trim() ?? "";

  if (!clientId || !sig) {
    return new NextResponse(errorHtml("This unsubscribe link is invalid or incomplete."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!verifyUnsubscribeSignature(clientId, sig)) {
    return new NextResponse(errorHtml("This unsubscribe link is invalid or has expired."), {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new NextResponse(errorHtml("Service temporarily unavailable. Please try again later."), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { data: client, error: fetchErr } = await admin
    .from("clients")
    .select("id, unsubscribed_at")
    .eq("id", clientId)
    .maybeSingle();

  if (fetchErr || !client) {
    return new NextResponse(errorHtml("We could not find an account for this unsubscribe link."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (client.unsubscribed_at) {
    return new NextResponse(confirmationHtml(true), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("clients")
    .update({ unsubscribed_at: nowIso })
    .eq("id", clientId);

  if (updateErr) {
    return new NextResponse(errorHtml("Something went wrong. Please contact info@creditpathcanada.ca."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(confirmationHtml(false), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
