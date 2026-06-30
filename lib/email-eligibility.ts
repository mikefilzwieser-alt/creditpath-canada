export type ClientEmailEligibility = {
  subscription_status?: string | null;
  unsubscribed_at?: string | null;
};

/** Marketing / promotional sends: blocked when cancelled or unsubscribed. */
export function isEligibleForMarketingEmail(client: ClientEmailEligibility): boolean {
  const status = (client.subscription_status ?? "").trim().toLowerCase();
  if (status === "cancelled") return false;
  if (client.unsubscribed_at != null && String(client.unsubscribed_at).length > 0) return false;
  return true;
}

/** Winback on cancel: only respect explicit unsubscribe, not cancelled status. */
export function isEligibleForWinbackEmail(client: ClientEmailEligibility): boolean {
  if (client.unsubscribed_at != null && String(client.unsubscribed_at).length > 0) return false;
  return true;
}
