import { Resend } from "resend";
import { buildEmailFooter } from "@/lib/email-footer";

export type WinbackEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendWinbackEmail(to: string, name: string, unsubscribeUrl: string): Promise<WinbackEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? name;

  const subject = `${firstName}, your file is still waiting for you.`;

  const html = `
<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Credit Path Canada</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Your file is still<br>waiting for you.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">We saw you cancelled. We want to make sure you didn't leave empty-handed.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">

    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 20px;">The file that got you declined is still sitting there. Every month without a plan is a month your score isn't moving, your options aren't growing, and the vehicle — or whatever brought you to us — stays out of reach.</p>

    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">Credit Path Canada clients who follow the program are <strong style="color:#0F1923;">approval-ready within 8–10 months.</strong> We've seen it happen. Clients who follow the program are working toward approval in 8-10 months.</p>

    <!-- OFFER -->
    <div style="background:#F8F6F1;border-radius:14px;padding:24px;margin:0 0 28px;text-align:center;border:2px solid rgba(0,201,167,0.2);">
      <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">We Want You Back</p>
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0F1923;letter-spacing:-0.02em;">3 Months Free</p>
      <p style="margin:0 0 16px;font-size:13px;color:#6B7A8D;">Use code <strong style="color:#0F1923;">WINBACK3</strong> when you reactivate. No catch. No contracts.</p>
      <a href="https://www.creditpathcanada.ca/login" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:13px 32px;border-radius:100px;text-decoration:none;font-weight:800;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Reactivate My Account</a>
    </div>

    <!-- WHAT THEY MISS -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 32px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">What's Still Waiting</p>
      <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;">
        <span style="color:#00C9A7;font-weight:700;font-size:13px;">→</span>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#0F1923;">Your personalized blueprint built from your actual Equifax file</p>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;">
        <span style="color:#00C9A7;font-weight:700;font-size:13px;">→</span>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#0F1923;">3 monthly actions ranked by what moves your score fastest</p>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <span style="color:#00C9A7;font-weight:700;font-size:13px;">→</span>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#0F1923;">Michael personally reviewing your file when your window opens</p>
      </div>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
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
