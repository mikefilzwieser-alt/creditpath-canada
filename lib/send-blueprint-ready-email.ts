import { Resend } from "resend";

export type BlueprintReadyEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBlueprintReadyEmail(to: string, name: string): Promise<BlueprintReadyEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] ?? "" : "";
  const subject = firstName
    ? `${firstName}, your credit file just told us everything. Here's what we found.`
    : "Your credit file just told us everything. Here's what we found.";

  const html = `<div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
  <div style="background: #00C9A7; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Your Blueprint is Ready</h1>
  </div>
  <div style="padding: 32px;">
    <p>Hi ${escapeHtml(name)},</p>
    <p>We just finished analyzing your bureau — <span style="color: #00C9A7;">every tradeline, every collection, every inquiry</span>. Your personalized blueprint is ready.</p>
    <p>What you'll see when you log in might surprise you. Some things on your file are hurting you more than you think. Some are closer to fixed than you'd expect.</p>
    <p>Either way — you now have a clear plan. <span style="color: #00C9A7;">3 actions. Month by month.</span> Built from your actual file.</p>
    <p><span style="color: #00C9A7;">Most people never get this far. You did.</span></p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://www.creditpathcanada.ca/dashboard" style="background: #00C9A7; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Unlock My Blueprint →</a>
    </p>
    <p style="color: #888; font-size: 13px; text-align: center;">First 30 days free. No commitment. No guesswork.</p>
    <p style="margin-top: 32px;">— Michael Filzwieser<br><span style="color: #888; font-size: 13px;">Founder, Credit Path Canada<br>(604) 442-0894 · info@creditpathcanada.ca</span></p>
  </div>
  <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
    Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color: #00C9A7;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6
  </div>
</div>`;

  const { error } = await resend.emails.send({
    from,
    to: [to.trim()],
    subject,
    html,
  });

  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }

  return { sent: true };
}
