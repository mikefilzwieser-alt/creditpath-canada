import { Resend } from "resend";

export type MonthCompleteEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMonthCompleteEmail(
  to: string,
  args: { name: string; month: number; nextMonth: number; daysRemaining: number },
): Promise<MonthCompleteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  const { name, month, nextMonth, daysRemaining } = args;
  const html = `
<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Credit Path Canada</span>
    </div>
    <div style="font-size:32px;margin-bottom:8px;">🏆</div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Month ${month}<br>Complete.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">Every action done. You showed up when most people don't.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">

    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(name)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 24px;">Month ${month} is done. Every action complete. Do you know how many people actually follow through every month? Not many. <strong style="color:#0F1923;">You're already ahead of most.</strong></p>

    <!-- STAT STRIP -->
    <div style="display:flex;gap:1px;margin:0 0 28px;border-radius:12px;overflow:hidden;border:1px solid rgba(15,25,35,0.08);">
      <div style="flex:1;padding:16px;text-align:center;background:#F8F6F1;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#00C9A7;letter-spacing:-0.02em;">${month}</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.1em;">Month Done</p>
      </div>
      <div style="flex:1;padding:16px;text-align:center;background:#F8F6F1;border-left:1px solid rgba(15,25,35,0.08);">
        <p style="margin:0;font-size:22px;font-weight:800;color:#00C9A7;letter-spacing:-0.02em;">3</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.1em;">Actions Done</p>
      </div>
      <div style="flex:1;padding:16px;text-align:center;background:#F8F6F1;border-left:1px solid rgba(15,25,35,0.08);">
        <p style="margin:0;font-size:22px;font-weight:800;color:#00C9A7;letter-spacing:-0.02em;">${daysRemaining}d</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.1em;">Until Month ${nextMonth}</p>
      </div>
    </div>

    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 24px;">Your score is moving. The work is showing up. Month ${nextMonth} unlocks in ${daysRemaining} days — and it builds directly on what you just did.</p>

    <!-- WHILE YOU WAIT -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">While You Wait</p>
      <p style="margin:0 0 6px;font-size:13px;line-height:1.65;color:#0F1923;">🔕 <strong>Stay off the applications.</strong> Do not apply anywhere without contacting us first.</p>
      <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;">✅ <strong>Keep pre-auth payments running</strong> on every account. That's all you need to do right now.</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 32px;">
      <a href="https://www.creditpathcanada.ca/dashboard/blueprint#monthly-actions" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">See What's Next</a>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Michael Filzwieser</p>
      <p style="margin:0 0 2px;font-size:11px;color:#6B7A8D;">Founder, Credit Path Canada · Finance Director, Titanium Ford</p>
      <p style="margin:0;font-size:11px;color:#6B7A8D;">(604) 442-0894 · info@creditpathcanada.ca</p>
      <p style="margin:12px 0 0;font-size:11px;font-style:italic;color:#9CA3AF;">The clients who stay consistent are the ones who get approved.</p>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#F8F6F1;padding:16px 40px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#9CA3AF;">Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color:#00C9A7;text-decoration:none;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6</p>
    <p style="margin:6px 0 0;font-size:10px;color:#9CA3AF;">Credit Path Canada provides educational credit guidance only. We are not a licensed credit repair agency or financial advisor.</p>
  </div>

</div>`;

  const { error } = await resend.emails.send({
    from,
    to: [to.trim()],
    subject: `🏆 You crushed Month ${month}. Here's what's coming.`,
    html,
  });

  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }

  return { sent: true };
}
