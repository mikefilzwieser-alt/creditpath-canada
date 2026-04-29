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
  const html = `<div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
  <div style="background: #00C9A7; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">🏆 Month ${month} Complete</h1>
  </div>
  <div style="padding: 32px;">
    <p>Hi ${escapeHtml(name)},</p>
    <p>Month ${month} is done. Every action complete.</p>
    <p>Do you know how many people actually follow through every month? Not many. You're already ahead of most.</p>
    <p>Your score is moving. The work is showing up. Month ${nextMonth} unlocks in ${daysRemaining} days — and it builds directly on what you just did.</p>
    <div style="background: #e8f8f5; border-left: 4px solid #00C9A7; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>While you wait:</strong><br>Stay off the applications. Keep the pre-auth payments running. That's all you need to do right now.</p>
    </div>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://www.creditpathcanada.ca/dashboard/blueprint" style="background: #00C9A7; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">See What's Next →</a>
    </p>
    <p style="margin-top: 32px;">— Michael Filzwieser<br><span style="color: #888; font-size: 13px;">Founder, Credit Path Canada<br>(604) 442-0894 · info@creditpathcanada.ca</span></p>
  </div>
  <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
    Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color: #00C9A7;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6
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
