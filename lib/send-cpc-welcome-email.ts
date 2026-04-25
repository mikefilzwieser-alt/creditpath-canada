import { Resend } from "resend";

const LOGIN_URL = "https://creditpathcanada.ca/login";

export type CpcWelcomeEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

/**
 * Transactional welcome for VA-created clients (matches /api/send-welcome-email).
 */
export async function sendCpcWelcomeEmail(
  to: string,
  fullName: string,
  temporaryPassword: string,
): Promise<CpcWelcomeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  const html = `
    <p>Hi ${escapeHtml(fullName)},</p>
    <p>Welcome to Credit Path Canada. Your account is ready, and we are preparing your personalized credit blueprint.</p>
    <p><strong>Your login page:</strong><br /><a href="${LOGIN_URL}">${LOGIN_URL}</a></p>
    <p><strong>Your temporary password:</strong> ${escapeHtml(temporaryPassword)}</p>
    <p>Please sign in and update your password when prompted. Your blueprint will appear in your dashboard as soon as it is ready.</p>
    <p style="margin-top:1.25rem;">Your personalized credit roadmap is being built right now. Log in to see your plan.</p>
    <p style="margin-top:1.5rem;">Warm regards,<br /><strong>Credit Path Canada</strong></p>
  `.trim();

  const { error } = await resend.emails.send({
    from,
    to: [to.trim()],
    subject: "Your Credit Path Canada Blueprint is Being Prepared",
    html,
  });

  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }

  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
