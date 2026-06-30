import { Resend } from "resend";
import { buildEmailFooter } from "@/lib/email-footer";

const LOGO_URL = "https://www.creditpathcanada.ca/Teal%20Logo.png";
const SIGNATURE_URL = "https://www.creditpathcanada.ca/sig.jpg";

export type Month2CheckinEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendMonth2CheckinEmail(to: string, name: string, unsubscribeUrl: string): Promise<Month2CheckinEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const subject = firstName ? `${firstName}, month 2 is where it gets real` : "Month 2 is where it gets real";

  const html = `
<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <img src="${LOGO_URL}" alt="Credit Path Canada" style="display:block;width:160px;max-width:100%;height:auto;margin:0 0 24px;border-radius:8px;" />
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">CREDIT PATH CANADA</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Month 2.<br>The part that counts.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">Your file builds underneath before it shows on top.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">
    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName || name)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">If your score feels flat in Month 2, that is normal. It does not mean nothing is happening. It means <strong style="color:#00C9A7;">the foundation is being built before the number catches up</strong>.</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">Credit rebuilds in layers. Payments report. Balances settle. New habits start showing up on the file underneath the surface before you see the movement on top.</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">Months 2-3 are where most people quit because they cannot see the progress yet. <strong style="color:#00C9A7;">The ones who push through are the ones who put themselves in position to get approved.</strong></p>

    <!-- STAT STRIP -->
    <div style="display:flex;gap:1px;margin:0 0 28px;border-radius:12px;overflow:hidden;border:1px solid rgba(15,25,35,0.08);">
      <div style="flex:1;padding:16px;text-align:center;background:#F8F6F1;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#00C9A7;letter-spacing:-0.02em;">Month 2</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.1em;">You're here</p>
      </div>
      <div style="flex:1;padding:16px;text-align:center;background:#F8F6F1;border-left:1px solid rgba(15,25,35,0.08);">
        <p style="margin:0;font-size:22px;font-weight:800;color:#00C9A7;letter-spacing:-0.02em;">3</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.1em;">Actions this month</p>
      </div>
      <div style="flex:1;padding:16px;text-align:center;background:#F8F6F1;border-left:1px solid rgba(15,25,35,0.08);">
        <p style="margin:0;font-size:22px;font-weight:800;color:#00C9A7;letter-spacing:-0.02em;">↑</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.1em;">Building</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 32px;">
      <a href="https://www.creditpathcanada.ca/dashboard" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">See My Month 2 Actions</a>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
      <img src="${SIGNATURE_URL}" alt="Michael Filzwieser signature" style="display:block;width:120px;max-width:100%;height:auto;margin:0 0 10px;border-radius:8px;" />
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Michael Filzwieser</p>
      <p style="margin:0 0 2px;font-size:11px;color:#6B7A8D;">Founder, Credit Path Canada · Finance Director, Titanium Ford</p>
      <p style="margin:0;font-size:11px;color:#6B7A8D;">(604) 442-0894 · info@creditpathcanada.ca</p>
      <p style="margin:12px 0 0;font-size:11px;font-style:italic;color:#9CA3AF;">The clients who stay consistent are the ones who get approved.</p>
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
