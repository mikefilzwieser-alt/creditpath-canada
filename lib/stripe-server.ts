import Stripe from "stripe";

/** Stripe API version pinned to the installed SDK default. */
const API_VERSION = "2026-04-22.dahlia";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, { apiVersion: API_VERSION });
  }
  return stripeSingleton;
}
