/**
 * Post-processes Claude bureau JSON: Equifax payment status from rating codes only,
 * and preserves structured fields for downstream UI.
 */

function extractRatingCode(
  equifaxRatingCode: string | undefined,
  paymentStatus: string | undefined,
): string | undefined {
  const fromField = typeof equifaxRatingCode === "string" ? equifaxRatingCode.trim() : "";
  if (fromField) {
    const m = /^([RIO])(\d{1,2})$/i.exec(fromField.replace(/\s/g, ""));
    if (m) return `${m[1]!.toUpperCase()}${m[2]}`;
  }
  const combined = `${fromField} ${typeof paymentStatus === "string" ? paymentStatus : ""}`;
  const m2 = /\b([RIO])\s*(\d{1,2})\b/i.exec(combined);
  if (m2) return `${m2[1]!.toUpperCase()}${m2[2]}`;
  return undefined;
}

/**
 * Equifax-style codes: only use explicit R/I/O + digit for "late" semantics.
 * R1/I1/O1 = current; R2/I2 = 30d; R3/I3 = 60d; R8/I8 = repo; R9/I9 = bad debt.
 */
export function derivePaymentStatusFromEquifaxRating(
  ratingCode: string | undefined,
  paymentStatusFallback: string | undefined,
): string {
  const code = ratingCode?.replace(/\s/g, "").toUpperCase();
  const m = code && /^([RIO])(\d{1,2})$/.exec(code);
  if (m) {
    const family = m[1]!;
    const n = parseInt(m[2]!, 10);
    if (n === 1) return "Current / paid as agreed";
    if (n === 2) return `${family}2 — 30 days late`;
    if (n === 3) return `${family}3 — 60 days late`;
    if (n === 4) return `${family}4 — 90 days late`;
    if (n === 5) return `${family}5 — 120+ days late`;
    if (n === 6) return `${family}6 — See bureau for details`;
    if (n === 7) return `${family}7 — Making payments through consolidation order`;
    if (n === 8) return `${family}8 — Repossession`;
    if (n === 9) return `${family}9 — Bad debt / written off`;
    return `${code} — See bureau for details`;
  }

  const fb = typeof paymentStatusFallback === "string" ? paymentStatusFallback.trim() : "";
  if (!fb) return "—";

  // If text claims lateness but no rating code was found, do not assert delinquency.
  if (/\b(late|delinq|past\s*due|missed|default|charge[\s-]*off|repo)\b/i.test(fb) && !/\b[rio]\s*\d\b/i.test(fb)) {
    return "Payment status — confirm Equifax rating (R/I/O code) on source report";
  }
  return fb;
}

export function normalizeParsedBureau(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const o = { ...(parsed as Record<string, unknown>) };

  if (typeof o.consumer_proposal !== "boolean") {
    o.consumer_proposal = false;
  }

  const rawTop = o.equifax_score;
  const topScore =
    typeof rawTop === "number" && Number.isFinite(rawTop)
      ? rawTop
      : typeof rawTop === "string" && rawTop.trim() && Number.isFinite(Number(rawTop))
        ? Number(rawTop)
        : undefined;
  const topFactors = o.score_factors;
  const existingScore = o.score && typeof o.score === "object" ? (o.score as Record<string, unknown>) : {};
  if (topScore !== undefined || topFactors !== undefined) {
    o.score = {
      ...existingScore,
      ...(topScore !== undefined ? { equifax_score: topScore } : {}),
      ...(topFactors !== undefined ? { score_factors: topFactors } : {}),
    };
  }

  const tradelines = o.tradelines;
  if (!Array.isArray(tradelines)) return o;

  const next = tradelines.map((row) => {
    if (!row || typeof row !== "object") return row;
    const t = { ...(row as Record<string, unknown>) };
    const ratingField =
      (typeof t.equifax_rating_code === "string" && t.equifax_rating_code) ||
      (typeof t.rating_code === "string" && t.rating_code) ||
      "";
    const payFb = typeof t.payment_status === "string" ? t.payment_status : undefined;
    const extracted = extractRatingCode(ratingField, payFb);
    t.payment_status = derivePaymentStatusFromEquifaxRating(extracted, payFb);
    if (extracted) {
      t.equifax_rating_code = extracted;
      t.rating_code = extracted;
    }
    return t;
  });

  return { ...o, tradelines: next };
}
