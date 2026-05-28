import { Resend } from "resend";

export type MonthUnlockEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendMonthUnlockEmail(to: string, name: string, month: number): Promise<MonthUnlockEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const subject = firstName
    ? `${firstName} — Month ${month} is unlocked and ready`
    : `Month ${month} is unlocked and ready`;

  const html = `<div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
  <div style="background: #00C9A7; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Month ${month} Is Ready</h1>
  </div>
  <div style="padding: 32px;">
    <p>Hi ${escapeHtml(firstName || name)},</p>
    <p>You did it. All actions complete. 28 days in. <strong>Month ${month} is now unlocked.</strong></p>
    <p>Most people drop off before they get here. You didn't. <span style="color: #00C9A7; font-weight: 700;">That matters — and your score is going to reflect it.</span></p>
    <p>Log in now to see your Month ${month} actions. They're built directly from where your file stands today.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://www.creditpathcanada.ca/dashboard/blueprint" style="background: #00C9A7; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">See My Month ${month} Actions →</a>
    </p>
    <p style="color: #888; font-size: 13px;">Keep the momentum going. The clients who stay consistent are the ones who get approved.</p>
    <p style="margin-top: 32px;">— Michael Filzwieser<br><span style="color: #888; font-size: 13px;">Founder, Credit Path Canada<br>(604) 442-0894 · info@creditpathcanada.ca</span></p>
  </div>
  <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
    Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color: #00C9A7;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6
  </div>
</div>`;

  const { error } = await resend.emails.send({ from, to: [to.trim()], subject, html });
  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }
  return { sent: true };
}
