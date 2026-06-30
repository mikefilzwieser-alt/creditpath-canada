/**
 * Shared transactional email shell (teal header + footer) — matches blueprint-ready styling.
 */
import { buildLegacyDripEmailFooter } from "@/lib/email-footer";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapCpcEmailHtml(title: string, innerBodyHtml: string, unsubscribeUrl: string): string {
  return `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
  <div style="background: #00C9A7; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">${escapeHtml(title)}</h1>
  </div>
  <div style="padding: 32px;">
    ${innerBodyHtml}
  </div>
${buildLegacyDripEmailFooter(unsubscribeUrl)}
</div>`;
}
