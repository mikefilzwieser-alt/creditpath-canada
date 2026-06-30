import { Resend } from "resend";
import { buildEmailFooter } from "@/lib/email-footer";

const LOGO_URL = "https://www.creditpathcanada.ca/Teal%20Logo.png";
const SIGNATURE_URL = "https://www.creditpathcanada.ca/sig.jpg";

export type ReengagementEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendReengagementEmail(to: string, name: string, unsubscribeUrl: string): Promise<ReengagementEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const subject = firstName ? `${firstName}, your blueprint is still here` : "Your blueprint is still here";

  const html = `<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <img src="${LOGO_URL}" alt="Credit Path Canada" style="display:block;width:160px;max-width:100%;height:auto;margin:0 0 24px;border-radius:8px;" />
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">CREDIT PATH CANADA</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Still Here<br>When You're Ready</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">Your blueprint is waiting right where you left it.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">
    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName || name)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 22px;">It looks like things got busy. That's completely okay — life happens. But your file is still here, and so is the plan.</p>

    <div style="background:#F8F6F1;border-left:3px solid #00C9A7;border-radius:0 12px 12px 0;padding:18px 22px;margin:0 0 22px;">
      <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#0F1923;font-style:italic;">"My credit is shot and I wasn't sure how I'd get back on the road. Michael took great care of me — incredibly patient with all my anxiety. As long as I make my payments on time, I can trade up in a year while working on my credit. I'll be calling you, Michael."</p>
      <p style="margin:0;font-size:11px;font-weight:700;color:#6B7A8D;">— Cassandra B. · ★★★★★ Google Review</p>
    </div>

    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">The clients who stay consistent — <strong style="color:#0F1923;">even when life gets in the way</strong> — are the ones who get there. It only takes a few minutes to pick back up.</p>

    <div style="text-align:center;margin:0 0 32px;">
      <a href="https://www.creditpathcanada.ca/dashboard" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Pick Up Where I Left Off</a>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
      <img src="${SIGNATURE_URL}" alt="Michael Filzwieser signature" style="display:block;width:120px;max-width:100%;height:auto;margin:0 0 10px;border-radius:8px;" />
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Michael Filzwieser</p>
      <p style="margin:0 0 2px;font-size:11px;color:#6B7A8D;">Founder, Credit Path Canada · Finance Director, Titanium Ford</p>
      <p style="margin:0;font-size:11px;color:#6B7A8D;">(604) 442-0894 · info@creditpathcanada.ca</p>
      <p style="margin:12px 0 0;font-size:11px;font-style:italic;color:#9CA3AF;">Built for Canadian families the system forgot.</p>
    </div>
  </div>

${buildEmailFooter(unsubscribeUrl)}

</div>`;

  const { error } = await resend.emails.send({ from, to: [to.trim()], subject, html });
  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }
  return { sent: true };
}
