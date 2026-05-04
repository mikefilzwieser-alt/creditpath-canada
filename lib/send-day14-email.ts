import { Resend } from "resend";

export type Day14EmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendDay14Email(to: string, name: string): Promise<Day14EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const subject = firstName
    ? `${firstName} — one question about your first two weeks`
    : "One question about your first two weeks";

  const html = `<div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
  <div style="background: #00C9A7; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Two Weeks In</h1>
  </div>
  <div style="padding: 32px;">
    <p>Hi ${escapeHtml(firstName || name)},</p>
    <p>Quick check-in — have you set up pre-authorized payments on your accounts yet?</p>
    <p>It sounds simple. But it's the single highest-impact action in Month 1. One missed payment can undo months of progress. Pre-authorized payments make sure that never happens.</p>
    <p>If you haven't done it yet — this week is the week. Log in, check off that action, and you're protected going forward.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://www.creditpathcanada.ca/dashboard" style="background: #00C9A7; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Check My Actions →</a>
    </p>
    <p style="color: #888; font-size: 13px;">Reply to this email if you have any questions. I'm here.</p>
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
