/** Stripe / manual comp: when set (case-insensitive), user may use the dashboard without a paid `active` status. */
export const CCVIP2026_PROMO_CODE = "CCVIP2026";
export const FIRSTNATIONS_PROMO_CODE = "FIRSTNATIONS";

const LIFETIME_PROMO_CODES = [CCVIP2026_PROMO_CODE, FIRSTNATIONS_PROMO_CODE];

export function normalizeAppliedPromoCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

export function isLifetimePromoCode(code: string | null | undefined): boolean {
  return LIFETIME_PROMO_CODES.includes(normalizeAppliedPromoCode(code));
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
  // Lifetime promo codes always grant access regardless of subscription status
  if (isLifetimePromoCode(params.appliedPromoCode)) return true;

  const status = (params.subscriptionStatus ?? "").trim().toLowerCase();
  if (status === "active") return true;
  if (status === "trial") {
    return trialWithPaymentAllowsDashboard(params.trialStart, params.stripeCustomerId);
  }
  if (status === "cancelled") {
    return cancelledWithAccessWindowAllowsDashboard(params.accessUntil);
  }
  return false;
}
