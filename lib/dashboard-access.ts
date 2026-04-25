/** Stripe / manual comp: when set (case-insensitive), user may use the dashboard without a paid `active` status. */
export const CCVIP2026_PROMO_CODE = "CCVIP2026";

export function normalizeAppliedPromoCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/**
 * Trial users may use the dashboard only after Stripe Checkout has created a customer
 * (`stripe_customer_id` on `clients`). There is no dashboard access on `trial` without it.
 */
export function trialWithPaymentAllowsDashboard(
  _trialStart: string | null | undefined,
  stripeCustomerId: string | null | undefined,
): boolean {
  const sid = (stripeCustomerId ?? "").trim();
  return Boolean(sid);
}

export function cancelledWithAccessWindowAllowsDashboard(
  accessUntil: string | null | undefined,
): boolean {
  if (!accessUntil) return false;
  const until = new Date(accessUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}

export function hasDashboardPaywallAccess(params: {
  subscriptionStatus: string | null | undefined;
  appliedPromoCode: string | null | undefined;
  trialStart?: string | null | undefined;
  stripeCustomerId?: string | null | undefined;
  accessUntil?: string | null | undefined;
}): boolean {
  const status = (params.subscriptionStatus ?? "").trim().toLowerCase();
  if (status === "active") return true;
  if (status === "trial") {
    return trialWithPaymentAllowsDashboard(params.trialStart, params.stripeCustomerId);
  }
  if (status === "cancelled") {
    return cancelledWithAccessWindowAllowsDashboard(params.accessUntil);
  }
  if (normalizeAppliedPromoCode(params.appliedPromoCode) === CCVIP2026_PROMO_CODE) return true;
  return false;
}
