function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared compliance footer for all client-facing emails. */
export function buildEmailFooter(unsubscribeUrl: string): string {
  const safeUrl = escapeHtmlAttr(unsubscribeUrl);
  return `  <!-- FOOTER -->
  <div style="background:#F8F6F1;padding:16px 40px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#9CA3AF;">Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color:#00C9A7;text-decoration:none;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6</p>
    <p style="margin:6px 0 0;font-size:10px;color:#9CA3AF;">Credit Path Canada provides educational credit guidance only. We are not a licensed credit repair agency or financial advisor.</p>
    <p style="margin:8px 0 0;font-size:10px;color:#9CA3AF;"><a href="${safeUrl}" style="color:#6B7A8D;text-decoration:underline;">Unsubscribe</a> from promotional emails</p>
  </div>`;
}

/** Legacy teal-header drip layout footer (email-drip route). */
export function buildLegacyDripEmailFooter(unsubscribeUrl: string): string {
  const safeUrl = escapeHtmlAttr(unsubscribeUrl);
  return `  <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
    Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color: #00C9A7;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6
    <p style="margin:8px 0 0;font-size:11px;color:#888;"><a href="${safeUrl}" style="color:#666;text-decoration:underline;">Unsubscribe</a> from promotional emails</p>
  </div>`;
}
