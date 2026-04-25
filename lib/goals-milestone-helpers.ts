/**
 * Shared metrics for Goals / dashboard — mirrors blueprint top-action count and rebuild score logic.
 */

export type ParsedBureauLite = {
  consumer_proposal?: boolean;
  tradelines?: Array<{
    creditor_name?: string;
    network?: string;
    account_type?: string;
    account_class?: string;
    equifax_rating_code?: string;
    rating_code?: string;
    credit_limit?: number | string;
    balance?: number | string;
    late_30?: number | string;
    late_60?: number | string;
    late_90?: number | string;
    payment_status?: string;
  }>;
  collections?: Array<{ amount?: number | string; months_to_falloff?: number | string }>;
  summary?: {
    utilization_percentage?: number | string;
    hard_inquiries_12mo?: number | string;
    on_time_payment_percentage?: number | string;
  };
  score?: { equifax_score?: number };
  equifax_score?: number;
};

export type BlueprintPlanLite = {
  rebuild_score?: number;
  pre_auth_required?: boolean;
  top_actions?: Array<{ action?: string; impact?: string; timeline?: string }>;
  auto_ready_alert?: boolean;
  readiness_percentage?: number;
};

export function numericValue(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function formatDisplay(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v.trim() || "—";
  return String(v);
}

function normalizeActionText(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizedActionMentionsPreAuth(norm: string): boolean {
  if (!norm) return false;
  if (/\bpreauth\w*\b/.test(norm)) return true;
  if (/\bpre\s+auth\w*\b/.test(norm)) return true;
  const re = /\bpre\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    if (/\bauth\w*\b/.test(norm.slice(m.index, m.index + 40))) return true;
  }
  return false;
}

type BlueprintTopAction = NonNullable<BlueprintPlanLite["top_actions"]>[number];

function secondSegmentIsCreditorFromAmount(s: string): boolean {
  const t = s.trim();
  return /^[A-Z][A-Za-z0-9\s\.'\-&]{1,120}\s+from\s+\$\d/.test(t);
}

function extractVerbPrefixBeforeFirstCreditorFrom(firstClause: string): string | null {
  const idx = firstClause.search(/\s(?=[A-Z][\s\S]*?\bfrom\s+\$\d)/);
  if (idx < 0) return null;
  const prefix = firstClause.slice(0, idx + 1);
  return prefix.trim() === "" ? null : prefix;
}

function splitDualCardTopAction(item: BlueprintTopAction): BlueprintTopAction[] {
  const raw = typeof item.action === "string" ? item.action : formatDisplay(item.action);
  if (!raw || raw === "—" || !/\s+and\s+/i.test(raw)) return [item];

  const parts = raw.split(/\s+and\s+/i);
  if (parts.length !== 2) return [item];

  const firstClause = parts[0]!.trim();
  const secondClause = parts[1]!.trim();
  if (!firstClause || !secondClause) return [item];
  if (!/\bfrom\s+\$\d/.test(firstClause) || !/\bfrom\s+\$\d/.test(secondClause)) return [item];
  if (!secondSegmentIsCreditorFromAmount(secondClause)) return [item];

  const verbPrefix = extractVerbPrefixBeforeFirstCreditorFrom(firstClause);
  if (!verbPrefix) return [item];

  const secondActionText = `${verbPrefix}${secondClause}`.replace(/\s+/g, " ").trim();
  return [{ ...item, action: firstClause }, { ...item, action: secondActionText }];
}

function expandDualCardTopActions(rows: BlueprintTopAction[]): BlueprintTopAction[] {
  return rows.flatMap((row) => splitDualCardTopAction(row));
}

function filterIrrelevantAdditionalCardApplicationActions(
  rows: BlueprintTopAction[],
  revolvingNetworkCount: number,
): BlueprintTopAction[] {
  if (revolvingNetworkCount < 3) return rows;
  return rows.filter((item) => {
    const norm = normalizeActionText(formatDisplay(item.action));
    if (norm.includes("apply for") && norm.includes("additional") && norm.includes("credit card")) {
      return false;
    }
    return true;
  });
}

function countRevolvingRTradelinesLegacy(tradelines: NonNullable<ParsedBureauLite["tradelines"]>): number {
  let n = 0;
  for (const t of tradelines) {
    const codeRaw = String(t?.equifax_rating_code ?? t?.rating_code ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    if (/^R\d/.test(codeRaw)) {
      n += 1;
      continue;
    }
    if (/^[IO]\d/.test(codeRaw)) {
      continue;
    }

    const cls = String(t?.account_class ?? "")
      .toLowerCase()
      .replace(/\s/g, "_");
    if (cls === "revolving_line" || cls === "revolving_credit_card" || cls === "credit_card") {
      n += 1;
      continue;
    }

    const atype = String(t?.account_type ?? "").toLowerCase();
    if (/installment|auto loan|mortgage|student loan|personal loan|lease\b/.test(atype)) {
      continue;
    }
    if (/^open\b|open account|utility|utilities|cell|telco|telecom/.test(atype)) {
      continue;
    }
    if (
      atype.includes("credit card") ||
      atype.includes("visa") ||
      atype.includes("mastercard") ||
      atype.includes("american express") ||
      atype.includes(" amex") ||
      atype.startsWith("amex") ||
      atype.includes("store card") ||
      atype.includes("tire") ||
      atype.includes("revolving") ||
      (atype.includes("line of credit") && !atype.includes("student"))
    ) {
      n += 1;
    }
  }
  return n;
}

export function countNetworkCardsTowardMinimum(tradelines: NonNullable<ParsedBureauLite["tradelines"]>): number {
  const hasNetworkField = tradelines.some(
    (t) => typeof t?.network === "string" && String(t.network).trim().length > 0,
  );
  if (!hasNetworkField) {
    return countRevolvingRTradelinesLegacy(tradelines);
  }

  let n = 0;
  for (const t of tradelines) {
    const codeRaw = String(t?.equifax_rating_code ?? t?.rating_code ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    if (/^R[1-9]/.test(codeRaw)) {
      n += 1;
    }
  }
  return n;
}

const PRE_AUTH_ACTION_TEXT = "Set up pre-authorized payments on every account today";

/** Actions shown in the monthly program (months 1–4); month 5+ has no checklist in-app. */
export function getMonthlyProgramActionCount(currentMonth: number | null | undefined): number {
  const m = typeof currentMonth === "number" && Number.isFinite(currentMonth) ? Math.floor(currentMonth) : 1;
  if (m >= 5) return 0;
  return 3;
}

/** Same row count logic as blueprint “Top actions” list (max 5) — legacy full blueprint list. */
export function getDisplayedTopActionsCount(
  plan: BlueprintPlanLite | null | undefined,
  parsed: ParsedBureauLite | null | undefined,
): number {
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.top_actions)) return 0;
  const tradelinesForCount = Array.isArray(parsed?.tradelines) ? parsed.tradelines : [];
  const revolvingCount = countNetworkCardsTowardMinimum(tradelinesForCount);

  let rows: BlueprintTopAction[] = plan.top_actions.map((r) => ({ ...r }));

  if (plan.pre_auth_required) {
    const hasPreAuthAction = rows.some((item) =>
      normalizedActionMentionsPreAuth(normalizeActionText(formatDisplay(item.action))),
    );
    if (!hasPreAuthAction) {
      rows = [{ action: PRE_AUTH_ACTION_TEXT, impact: "High impact", timeline: "Do this immediately" }, ...rows];
    }
  }

  rows = rows.slice(0, 5);
  rows = expandDualCardTopActions(rows);
  rows = filterIrrelevantAdditionalCardApplicationActions(rows, revolvingCount);
  return rows.slice(0, 5).length;
}

export function computeSeverityAdjustedRebuildScore(
  planScore: number | undefined,
  parsed: ParsedBureauLite | null | undefined,
  equifaxScore: number,
): number {
  const baseline =
    typeof planScore === "number" && Number.isFinite(planScore)
      ? Math.round(Math.min(100, Math.max(0, planScore)))
      : Math.round(Math.min(100, Math.max(0, (equifaxScore - 300) / 5.5)));

  const summary = parsed?.summary ?? {};
  const inquiries = numericValue(summary.hard_inquiries_12mo);
  const collections = Array.isArray(parsed?.collections) ? parsed.collections : [];
  const tradelines = Array.isArray(parsed?.tradelines) ? parsed.tradelines : [];

  const collectionsCount = collections.length;
  const collectionsTotal = collections.reduce((sum, c) => sum + numericValue(c.amount), 0);
  const overLimitCount = tradelines.filter((t) => {
    const limit = numericValue(t.credit_limit);
    const bal = numericValue(t.balance);
    return limit > 0 && bal > limit;
  }).length;
  const hasRepossession = tradelines.some((t) => {
    const code = String(t.equifax_rating_code ?? t.rating_code ?? "")
      .replace(/\s/g, "")
      .toUpperCase();
    return /[RIO]8\b/.test(code) || /repo/i.test(String(t.payment_status ?? ""));
  });
  const seriousDerogCount = tradelines.filter((t) => {
    const code = String(t.equifax_rating_code ?? t.rating_code ?? "")
      .replace(/\s/g, "")
      .toUpperCase();
    const digit = /^([RIO])(\d)/.exec(code)?.[2];
    return digit ? Number(digit) >= 7 : false;
  }).length;

  const penalty = Math.min(
    90,
    inquiries * 0.35 +
      collectionsCount * 12 +
      (collectionsTotal / 1000) * 0.9 +
      overLimitCount * 10 +
      (hasRepossession ? 18 : 0) +
      seriousDerogCount * 6,
  );

  let score = Math.round(Math.max(0, Math.min(100, baseline - penalty)));
  const severeProfile =
    inquiries >= 80 || collectionsTotal >= 20000 || hasRepossession || overLimitCount >= 2 || collectionsCount >= 3;
  if (severeProfile) {
    score = Math.min(35, Math.max(15, score));
  }
  return score;
}

export function equifaxScoreFromParsed(parsed: ParsedBureauLite | null | undefined): number | null {
  const raw = parsed as Record<string, unknown> | null | undefined;
  const s =
    (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? parsed?.score?.equifax_score;
  return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(850, Math.max(0, s))) : null;
}

export function utilizationPercent(parsed: ParsedBureauLite | null | undefined): number | null {
  const u = parsed?.summary?.utilization_percentage;
  const n = numericValue(u);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(Math.min(100, n));
}

export function hasAnyLateTradelines(parsed: ParsedBureauLite | null | undefined): boolean {
  const tradelines = Array.isArray(parsed?.tradelines) ? parsed.tradelines : [];
  return tradelines.some((t) => {
    const codeRaw = String(t?.equifax_rating_code ?? t?.rating_code ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    const digit = /^([RIO])(\d)/.exec(codeRaw)?.[2];
    const lateViaRating = digit ? Number(digit) >= 2 : false;
    const lateViaColumns =
      numericValue(t?.late_30) > 0 || numericValue(t?.late_60) > 0 || numericValue(t?.late_90) > 0;
    return lateViaRating || lateViaColumns;
  });
}

export function collectionsAgingOrEmpty(parsed: ParsedBureauLite | null | undefined): boolean {
  const collections = Array.isArray(parsed?.collections) ? parsed.collections : [];
  if (collections.length === 0) return true;
  return collections.every((c) => {
    const raw = (c as { months_to_falloff?: unknown }).months_to_falloff;
    const m = numericValue(raw);
    return m > 0 && m <= 24;
  });
}
