import { createHmac, timingSafeEqual } from "crypto";

let unsubscribeSecretFallbackWarned = false;
let unsubscribeSecretMissingWarned = false;

/**
 * HMAC signing secret: prefer UNSUBSCRIBE_SECRET so unsubscribe links can be rotated
 * independently of cron auth (EMAIL_TRIGGER_SECRET).
 */
function getUnsubscribeSecret(): string | null {
  const dedicated = process.env.UNSUBSCRIBE_SECRET?.trim();
  if (dedicated) return dedicated;

  const fallback = process.env.EMAIL_TRIGGER_SECRET?.trim();
  if (fallback) {
    if (!unsubscribeSecretFallbackWarned) {
      unsubscribeSecretFallbackWarned = true;
      console.error(
        "[unsubscribe-token] UNSUBSCRIBE_SECRET is not set; falling back to EMAIL_TRIGGER_SECRET for unsubscribe HMAC signing. Set UNSUBSCRIBE_SECRET in Vercel.",
      );
    }
    return fallback;
  }

  if (!unsubscribeSecretMissingWarned) {
    unsubscribeSecretMissingWarned = true;
    console.error(
      "[unsubscribe-token] Neither UNSUBSCRIBE_SECRET nor EMAIL_TRIGGER_SECRET is set; unsubscribe link signing will fail.",
    );
  }

  return null;
}

function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://www.creditpathcanada.ca";
}

function signClientId(clientId: string): string | null {
  const secret = getUnsubscribeSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(clientId).digest("hex");
}

export function generateUnsubscribeUrl(clientId: string): string {
  const sig = signClientId(clientId);
  if (!sig) {
    throw new Error("UNSUBSCRIBE_SECRET or EMAIL_TRIGGER_SECRET must be set to generate unsubscribe URLs.");
  }
  const origin = getSiteOrigin();
  return `${origin}/api/unsubscribe?id=${encodeURIComponent(clientId)}&sig=${encodeURIComponent(sig)}`;
}

export function verifyUnsubscribeSignature(clientId: string, sig: string): boolean {
  if (!clientId || !sig || !/^[0-9a-f]{64}$/i.test(sig)) return false;
  const expected = signClientId(clientId);
  if (!expected) return false;
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig.toLowerCase(), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
