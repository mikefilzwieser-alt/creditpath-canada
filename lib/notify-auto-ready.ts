/**
 * When blueprint_data.auto_ready_alert is true, notify operations.
 * Set AUTO_READY_ALERT_WEBHOOK_URL to POST JSON (e.g. Zapier, Slack incoming webhook).
 * Payload includes notifyEmail for michaelf@titaniumford.ca as the intended recipient on the receiving side.
 */
export async function notifyAutoReadyAlert(payload: {
  blueprintId: string;
  clientId: string;
  clientEmail?: string | null;
  readinessPercentage?: number;
}): Promise<void> {
  const url = process.env.AUTO_READY_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "auto_loan_readiness",
      notifyEmail: "michaelf@titaniumford.ca",
      ...payload,
    }),
  });
}
