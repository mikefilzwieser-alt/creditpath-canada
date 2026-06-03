import { Resend } from "resend";

export type Day10EmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendDay10Email(to: string, name: string): Promise<Day10EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? name;

  const subject = `${firstName}, your blueprint is waiting — 3 actions, that's it.`;

  const html = `
<div style="font-family:'Montserrat',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Credit Path Canada</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Your plan is ready.<br>Let's get you approved.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">3 actions. That's all that's between you and Month 1 complete.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">

    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 20px;">We noticed you haven't logged in yet. We get it — life gets busy. But here's what's waiting for you: a personalized blueprint built from your actual Equifax file, with <strong style="color:#0F1923;">3 clear actions ranked by what moves your score the fastest.</strong></p>

    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">The clients who follow through are the ones who get approved. In their name. Zero down. 8–10 months. It starts with logging in.</p>

    <!-- HOW EASY IT IS -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">Here's How Simple This Is</p>
      <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;">
        <div style="min-width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#00C9A7;">1</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;">Log in and see your 3 actions for Month 1</p>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;">
        <div style="min-width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#00C9A7;">2</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;">Complete them over the next 28 days</p>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="min-width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#00C9A7;">3</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;">Month 2 unlocks automatically. Repeat until approved.</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="https://www.creditpathcanada.ca/dashboard/blueprint#monthly-actions" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">See My Actions</a>
      <p style="margin:10px 0 0;font-size:10px;color:#9CA3AF;">Takes less than 2 minutes to log in and see your plan.</p>
    </div>

    <!-- DIVIDER -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);margin:0 0 24px;"></div>

    <!-- BOOK A CALL -->
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:32px;">
      <div style="min-width:40px;height:40px;background:rgba(0,201,167,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">📅</div>
      <div>
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Not sure where to start?</p>
        <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6B7A8D;">Book a free 15-minute call and I'll walk you through your file personally. No cost, no obligation.</p>
        <a href="https://calendly.com/aec-michael/15min" style="font-size:11px;font-weight:700;color:#00C9A7;text-decoration:none;">Book with Michael →</a>
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

  <!-- FOOTER -->
  <div style="background:#F8F6F1;padding:16px 40px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#9CA3AF;">Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color:#00C9A7;text-decoration:none;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6</p>
    <p style="margin:6px 0 0;font-size:10px;color:#9CA3AF;">Credit Path Canada provides educational credit guidance only. We are not a licensed credit repair agency or financial advisor.</p>
  </div>

</div>`;

  const { error } = await resend.emails.send({ from, to: [to.trim()], subject, html });
  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }
  return { sent: true };
}
