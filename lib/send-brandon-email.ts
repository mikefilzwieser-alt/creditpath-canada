import { Resend } from "resend";
import { buildEmailFooter } from "@/lib/email-footer";

const LOGO_URL = "https://www.creditpathcanada.ca/Teal%20Logo.png";
const SIGNATURE_URL = "https://www.creditpathcanada.ca/sig.jpg";

export type BrandonEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendBrandonEmail(to: string, name: string, unsubscribeUrl: string): Promise<BrandonEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const subject = firstName
    ? `${firstName} — a free session with a financial planner, on us`
    : "A free session with a financial planner, on us";

  const html = `<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <img src="${LOGO_URL}" alt="Credit Path Canada" style="display:block;width:160px;max-width:100%;height:auto;margin:0 0 24px;border-radius:8px;" />
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">CREDIT PATH CANADA</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">A Gift<br>From Us</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">An extra layer of support, at no cost.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">
    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName || name)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">You're three days into your Credit Path Canada program. We want to make sure you have everything you need to succeed — including a conversation with someone who can look at the full picture.</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">We've partnered with <strong style="color:#0F1923;">Brandon Kirk</strong> at Safe Wealth Planners to offer you a <span style="color:#00C9A7;">free financial planning session</span> — no obligation, no sales pitch. Just an honest conversation about your finances and where you're headed.</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">Brandon works with Canadians rebuilding their financial foundation every day. This session is normally $150. It's yours free as a Credit Path Canada client.</p>

    <div style="text-align:center;margin:0 0 32px;">
      <a href="https://calendly.com/brandonkirk/" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Book My Free Session →</a>
    </div>

    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 32px;">
      <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;">This is completely optional. Your blueprint is already working. This is just an extra layer of support — because you deserve it.</p>
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
