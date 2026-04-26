"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { buildFoundationMonthActions, type MonthlyProgramAction } from "@/lib/monthly-program-actions";
import {
  getProgramMonthThemeSubtitle,
  getProgramMonthThemeTitle,
  MAX_THEMED_PROGRAM_MONTH,
  normalizeProgramMonth,
} from "@/lib/monthly-progression-themes";
import { logPostgrestError } from "@/lib/log-postgrest-error";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";

type ParsedBureau = {
  dnq?: boolean;
  dnq_reason?: string;
  equifax_score?: number;
  recommended_cards?: number;
  personal?: { name?: string; dob?: string; address?: string };
  score?: {
    equifax_score?: number;
    score_factors?: unknown;
  };
  summary?: {
    total_accounts?: number | string;
    open_accounts?: number | string;
    utilization_percentage?: number | string;
    on_time_payment_percentage?: number | string;
    derogatory_marks?: number | string;
    hard_inquiries_12mo?: number | string;
  };
  tradelines?: Array<{
    creditor_name?: string;
    network?: string;
    account_type?: string;
    account_class?: string;
    equifax_rating_code?: string;
    rating_code?: string;
    balance?: number | string;
    credit_limit?: number | string;
    utilization?: number | string;
    payment_status?: string;
    late_30?: number | string;
    late_60?: number | string;
    late_90?: number | string;
    action_recommended?: string;
  }>;
  collections?: Array<{
    creditor?: string;
    amount?: number | string;
    date_of_last_activity?: string;
    estimated_falloff_date?: string;
    months_to_falloff?: number | string;
    status?: string;
    recommendation?: string;
  }>;
  errors_detected?: Array<{
    description?: string;
    dispute_priority?: string;
  }>;
};

type BlueprintPlan = {
  rebuild_score?: number;
  rebuild_score_label?: string;
  score_summary?: string;
  this_months_focus?: string;
  top_actions?: Array<{
    action?: string;
    impact?: string;
    timeline?: string;
  }>;
  tradeline_priorities?: unknown;
  collection_strategy?: unknown;
  pre_auth_required?: boolean;
  auto_ready_alert?: boolean;
  readiness_percentage?: number;
};

type BlueprintRow = {
  id: string;
  client_id: string;
  month_number: number;
  status: string;
  raw_parse_data: ParsedBureau | null;
  blueprint_data: BlueprintPlan | null;
  created_at: string;
  updated_at: string;
  current_month?: number | null;
  month_unlocked_at?: string | null;
};

type MonthlyPlanRow = {
  month_number: number;
  theme: string | null;
  actions: unknown;
};

type TabId = "overview" | "tradelines" | "collections" | "errors";

function formatDisplay(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v.trim() || "—";
  return String(v);
}

function formatPercent(v: unknown): string {
  const display = formatDisplay(v);
  return display === "—" ? display : `${display}%`;
}

function formatCurrency(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^0-9.-]/g, "")) : NaN;
  if (!Number.isFinite(n)) return formatDisplay(v);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function numericValue(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Collapse whitespace for stable matching. */
function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Capitalize the first letter of each bullet (lead-in only). */
function capitalizeBulletStarts(bullets: string[]): string[] {
  return bullets.map((b) => {
    const t = b.trim();
    if (!t) return t;
    return t.replace(/^([a-z])/, (_, c: string) => c.toUpperCase());
  });
}

/** Normalize Pay down / utilization bullet toward clean copy (em dash, shorter “main card”, trim parens). */
function normalizePayDownThirdBullet(s: string): string {
  let t = collapseWs(s);
  t = t.replace(/\bcards\s*\(\s*/i, "cards — ");
  t = t.replace(/\bmain\s+Canadian\s+Tire\s+card\b/gi, "main card");
  t = t.replace(/\)\s+(to\s+get\s+under)/i, " $1");
  t = t.replace(/\)\s*$/i, "");
  t = collapseWs(t);
  if (!/[.!?]$/.test(t)) t = `${t}.`;
  return t;
}

/** Ensure a single-sentence bullet ends with . ! or ? */
function ensureSentenceEnd(s: string): string {
  const t = collapseWs(s);
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

/**
 * Focus bullets: (1) EMERGENCY line only, (2) inquiries (You have N inquiries…), (3) Pay down…
 * When EMERGENCY is present and both other segments exist, returns exactly three non-overlapping bullets.
 */
function splitFocusIntoBullets(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];

  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/[•▪◦]/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();

  const em = cleaned.match(
    /^(EMERGENCY:\s*Stop\s+all\s+credit\s+applications\s+immediately)\s*[.]?\s*([\s\S]*)$/im,
  );
  if (em) {
    const first = "EMERGENCY: Stop all credit applications immediately.";
    const work = collapseWs(em[2] ?? "").replace(/^(and|&|,)\s+/i, "").trim();

    const inqRe = /\bYou have\s+\d+\s+inquiries\b/i;
    const inqExec = inqRe.exec(work);
    const inqStart = inqExec ? inqExec.index : -1;
    const payStart = work.search(/\bPay\s+down\b/i);

    if (inqStart >= 0 && payStart >= 0 && inqStart !== payStart) {
      let second: string;
      let third: string;
      if (inqStart < payStart) {
        second = work.slice(inqStart, payStart).trim();
        third = work.slice(payStart).trim();
      } else {
        third = work.slice(payStart, inqStart).trim();
        second = work.slice(inqStart).trim();
      }
      third = normalizePayDownThirdBullet(third);
      return capitalizeBulletStarts([first, ensureSentenceEnd(second), third]);
    }

    if (work) {
      return capitalizeBulletStarts([first, ensureSentenceEnd(work)]);
    }
    return capitalizeBulletStarts([first]);
  }

  const lineChunks = cleaned.split(/\n+/).flatMap((line) => line.split(/(?:[.;](?:\s+|$))/g));
  const out: string[] = [];
  for (const piece of lineChunks) {
    const chunk = piece.trim();
    if (!chunk) continue;
    out.push(chunk);
  }
  const merged: string[] = [];
  for (const bullet of out) {
    if (/^and\b/i.test(bullet) && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${bullet}`;
    } else {
      merged.push(bullet);
    }
  }
  return capitalizeBulletStarts(merged);
}

const PRE_AUTH_FOCUS_FALLBACK =
  "Set up pre-authorized payments on every account today to protect your payment history.";
const GENERIC_FOCUS_FALLBACK = "Keep all accounts current and do not miss any payments this month.";

function hardInquiries12moCount(parsed: ParsedBureau | null | undefined): number {
  return Math.round(numericValue(parsed?.summary?.hard_inquiries_12mo));
}

function focusBulletMentionsPreAuthorized(text: string): boolean {
  return /pre[-\s]?authorized/i.test(text);
}

function focusBulletMentionsInquiries(text: string): boolean {
  return /inquiries/i.test(text);
}

/** Pad split focus bullets to at least three items using ordered fallbacks. */
function padFocusBulletsWithDefaults(
  bullets: string[],
  plan: BlueprintPlan | null | undefined,
  parsed: ParsedBureau | null | undefined,
): string[] {
  const out = [...bullets];
  while (out.length < 3) {
    if (plan?.pre_auth_required && !out.some((b) => focusBulletMentionsPreAuthorized(b))) {
      out.push(PRE_AUTH_FOCUS_FALLBACK);
      continue;
    }
    const inq = hardInquiries12moCount(parsed);
    if (inq > 0 && !out.some((b) => focusBulletMentionsInquiries(b))) {
      out.push(
        `You have ${inq} hard inquiries in the last 12 months — avoid any new credit applications.`,
      );
      continue;
    }
    out.push(GENERIC_FOCUS_FALLBACK);
  }
  return capitalizeBulletStarts(out);
}

/**
 * Month 1: at most two bullets from the plan’s own focus text only (no padded pre-auth / inquiries / generic bullets).
 * Month 2+: unchanged — full split + padding to at least three items when needed.
 */
function computeFocusBulletsForDisplay(
  plan: BlueprintPlan | null | undefined,
  parsed: ParsedBureau | null | undefined,
  programMonthRaw: number | string | null | undefined,
): string[] {
  const programMonth = normalizeProgramMonth(programMonthRaw);
  const base = splitFocusIntoBullets(plan?.this_months_focus);

  if (programMonth !== 1) {
    return base.length >= 3 ? base : padFocusBulletsWithDefaults(base, plan, parsed);
  }

  if (base.length > 0) {
    return base.slice(0, 2);
  }

  const raw = typeof plan?.this_months_focus === "string" ? plan.this_months_focus.trim() : "";
  if (!raw) return [];

  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length >= 2) {
    return capitalizeBulletStarts(sentences.slice(0, 2));
  }
  return capitalizeBulletStarts([raw]);
}

function normalizeSentenceCapitalization(raw: unknown): string {
  const text = formatDisplay(raw);
  if (text === "—") return text;
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, prefix: string, letter: string) => {
    return `${prefix}${letter.toUpperCase()}`;
  });
}

function normalizeActionText(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * True if normalized copy reads as a pre-auth / pre-authorized payment action (dedupe vs injected row).
 * Uses word-boundary "pre" plus "auth" nearby (covers pre-auth, pre-authorized, preauthorized, API rewrites).
 */
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

type BlueprintTopAction = NonNullable<BlueprintPlan["top_actions"]>[number];

/** Second clause looks like "Capital One from $201…" (creditor then from $amount). */
function secondSegmentIsCreditorFromAmount(s: string): boolean {
  const t = s.trim();
  return /^[A-Z][A-Za-z0-9\s\.'\-&]{1,120}\s+from\s+\$\d/.test(t);
}

/** Prefix before first creditor phrase that leads to "from $digits" (e.g. "Pay down " for "Pay down Canadian Tire…"). */
function extractVerbPrefixBeforeFirstCreditorFrom(firstClause: string): string | null {
  const idx = firstClause.search(/\s(?=[A-Z][\s\S]*?\bfrom\s+\$\d)/);
  if (idx < 0) return null;
  const prefix = firstClause.slice(0, idx + 1);
  return prefix.trim() === "" ? null : prefix;
}

/**
 * If one action strings two card paydowns joined with " and ", split into two rows (same impact/timeline).
 */
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
  return [
    { ...item, action: firstClause },
    { ...item, action: secondActionText },
  ];
}

function expandDualCardTopActions(rows: BlueprintTopAction[]): BlueprintTopAction[] {
  return rows.flatMap((row) => splitDualCardTopAction(row));
}

/** When the client already has enough R-revolving cards, hide "apply for additional credit card" style actions. */
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

function monthsToFalloffValue(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = numericValue(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function computeSeverityAdjustedRebuildScore(
  planScore: number | undefined,
  parsed: ParsedBureau | null | undefined,
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

function escapeHtml(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Encode binary for data URLs without call-stack overflow on large PNGs. */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function scoreToLetterGrade(score: number): string {
  if (!Number.isFinite(score) || score < 300) return "—";
  if (score >= 760) return "A+";
  if (score >= 720) return "A";
  if (score >= 680) return "B";
  if (score >= 640) return "C";
  if (score >= 600) return "D";
  return "F";
}

function inferFactorGrade(text: string): string {
  const t = text.toLowerCase();
  if (/positive|good|excellent|strong|length|established/.test(t)) return "A";
  if (/fair|moderate|average/.test(t)) return "B";
  if (/high util|balance|limit|inquiry|new account/.test(t)) return "C";
  if (/late|delinq|missed|collection|charge|default|serious|negative/.test(t)) return "D";
  return "B";
}

const CREDIT_PRODUCT_OFFERS = [
  {
    name: "Neo Financial",
    description: "Canada's top credit-building card. Reports to Equifax. Apply now.",
    href: "https://neo.cc/refer/G3Y6L5A9",
    cta: "Apply now",
  },
  {
    name: "Tangerine Money-Back Credit Card",
    description:
      "No credit check secured option. Reports to both Equifax and TransUnion.",
    href: "https://www.tangerine.ca/en/products/spending/creditcard",
    cta: "Apply now",
  },
  {
    name: "Koho",
    description: "No credit check. Build credit with every purchase. Reports to Equifax.",
    href: "https://www.koho.ca",
    cta: "Get started",
  },
] as const;

/**
 * Legacy: count R-like revolving rows when parse has no `network` field (older blueprints).
 * I* / O* codes are excluded when explicit.
 */
function countRevolvingRTradelinesLegacy(tradelines: NonNullable<ParsedBureau["tradelines"]>): number {
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

/**
 * Count R-rated revolving tradelines (R1–R9) toward the 3-card minimum — store cards,
 * Canadian Tire, and any network (store_only, n/a, Visa, etc.) all count when the rating is R.
 * When the parse omits `network` on every row, fall back to legacy heuristics.
 */
function countNetworkCardsTowardMinimum(tradelines: NonNullable<ParsedBureau["tradelines"]>): number {
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

function normalizeScoreFactors(raw: unknown): { text: string; grade: string }[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === "string") {
        return { text: item, grade: inferFactorGrade(item) };
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const text =
          [o.factor, o.description, o.reason, o.name, o.message].find((x) => typeof x === "string") ?? "";
        const label = String(text || "Factor");
        const g = typeof o.grade === "string" && o.grade.trim() ? o.grade.trim().toUpperCase() : inferFactorGrade(label);
        return { text: label, grade: g };
      }
      return { text: String(item), grade: "B" };
    });
  }
  if (typeof raw === "string" && raw.trim()) {
    return [{ text: raw, grade: inferFactorGrade(raw) }];
  }
  return [];
}

/** Center value font size: max 42px, scales down for longer labels so digits stay inside the ring. */
function scoreRingCenterFontPx(centerValue: string): number {
  const t = centerValue.trim();
  if (t === "—" || t.length === 0) return 38;
  const len = t.length;
  if (len <= 2) return 42;
  if (len === 3) return 34;
  return Math.max(22, Math.round(126 / len));
}

function ScoreRing({
  score,
  maxScore,
  centerValue,
  subLabel,
  headingFontClass = "",
}: {
  score: number;
  maxScore: number;
  centerValue: string;
  subLabel: string;
  headingFontClass?: string;
}) {
  const vb = 200;
  const cx = vb / 2;
  const cy = vb / 2;
  const r = 80;
  const stroke = 8;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, score / maxScore));
  const offset = c * (1 - pct);
  const track = "rgba(255,255,255,0.12)";
  const fontPx = scoreRingCenterFontPx(centerValue);
  const innerDiameter = 2 * (r - stroke * 0.55);

  return (
    <div className="relative inline-flex shrink-0" style={{ width: vb, height: vb }}>
      <svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`} className="block" aria-hidden>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={TEAL}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </g>
      </svg>
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center ${headingFontClass}`}
        style={{
          paddingLeft: Math.max(10, stroke + 4),
          paddingRight: Math.max(10, stroke + 4),
          maxWidth: innerDiameter,
          margin: "0 auto",
        }}
      >
        <span
          className="w-full overflow-hidden text-center font-bold tabular-nums leading-none tracking-tight text-white text-ellipsis whitespace-nowrap"
          style={{
            fontSize: fontPx,
            maxWidth: innerDiameter,
            lineHeight: 1,
          }}
        >
          {centerValue}
        </span>
        <span className="mt-1.5 max-w-full text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-white/60">
          {subLabel}
        </span>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const high = p.includes("high") || p === "1" || p === "urgent";
  const low = p.includes("low") || p === "3";
  const bg = high ? "rgba(220, 38, 38, 0.12)" : low ? "rgba(107, 114, 128, 0.15)" : "rgba(234, 179, 8, 0.15)";
  const color = high ? "#b91c1c" : low ? "#4b5563" : "#a16207";
  return (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: bg, color }}>
      {priority || "—"}
    </span>
  );
}

const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;

export default function BlueprintPage() {
  const { user, loading: authLoading, headingFontClass: h } = useDashboardAuth();
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [monthlyPlanRow, setMonthlyPlanRow] = useState<MonthlyPlanRow | null>(null);
  const [error, setError] = useState("");
  const [showScoreSummaryDetail, setShowScoreSummaryDetail] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set());
  const completionsRef = useRef<Set<number>>(new Set());
  const [celebration, setCelebration] = useState<{ month: number; theme: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const { data, error: qErr } = await supabase
      .from("blueprints")
      .select(
        "id, client_id, month_number, status, raw_parse_data, blueprint_data, created_at, updated_at, current_month, month_unlocked_at",
      )
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) {
      setError(qErr.message);
      setBlueprint(null);
      setMonthlyPlanRow(null);
    } else {
      const row = data as BlueprintRow | null;
      setBlueprint(row);
      if (row?.id) {
        const cm = normalizeProgramMonth(row.current_month);
        if (cm >= 2 && cm <= MAX_THEMED_PROGRAM_MONTH) {
          const { data: mp, error: mpErr } = await supabase
            .from("monthly_plans")
            .select("month_number, theme, actions")
            .eq("blueprint_id", row.id)
            .eq("month_number", cm)
            .maybeSingle();
          if (mpErr) {
            setMonthlyPlanRow(null);
          } else {
            setMonthlyPlanRow(mp as MonthlyPlanRow | null);
          }
        } else {
          setMonthlyPlanRow(null);
        }
      } else {
        setMonthlyPlanRow(null);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    completionsRef.current = completedSet;
  }, [completedSet]);

  useEffect(() => {
    if (!user?.id || !blueprint?.id) {
      queueMicrotask(() => {
        const empty = new Set<number>();
        completionsRef.current = empty;
        setCompletedSet(empty);
      });
      return;
    }
    const programMonth = normalizeProgramMonth(blueprint.current_month);
    let cancelled = false;
    void (async () => {
      const { data, error: qErr } = await supabase
        .from("action_completions")
        .select("action_index")
        .eq("client_id", user.id)
        .eq("blueprint_id", blueprint.id)
        .eq("program_month", programMonth);
      if (cancelled) return;
      if (qErr) {
        logPostgrestError("[blueprint] action_completions select failed", qErr, {
          client_id: user.id,
          blueprint_id: blueprint.id,
          program_month: programMonth,
        });
        const empty = new Set<number>();
        completionsRef.current = empty;
        setCompletedSet(empty);
        return;
      }
      const indexes = new Set<number>();
      for (const row of (data ?? []) as Array<{ action_index?: number | null }>) {
        if (typeof row.action_index === "number" && Number.isFinite(row.action_index)) {
          indexes.add(row.action_index);
        }
      }
      completionsRef.current = indexes;
      setCompletedSet(indexes);
    })();
    return () => {
      cancelled = true;
    };
  }, [blueprint?.id, blueprint?.current_month, user?.id]);

  const parsed = blueprint?.raw_parse_data as ParsedBureau | null | undefined;
  const hasParsePayload =
    parsed != null &&
    typeof parsed === "object" &&
    (Object.keys(parsed).length > 0 || blueprint?.status === "ready");

  const showProcessing =
    blueprint?.status === "processing" && !hasParsePayload && !loading && !error;

  const showTabs = blueprint && (blueprint.status === "ready" || hasParsePayload);

  const plan = blueprint?.blueprint_data as BlueprintPlan | null | undefined;
  const hasPlan =
    plan != null &&
    typeof plan === "object" &&
    (Object.keys(plan as object).length > 0 ||
      typeof plan.rebuild_score === "number" ||
      Boolean(plan.this_months_focus) ||
      Boolean(plan.pre_auth_required));

  const equifaxScore = useMemo(() => {
    const raw = parsed as Record<string, unknown> | null | undefined;
    const s = (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? parsed?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(850, Math.max(0, s))) : 0;
  }, [parsed]);

  const equifaxScoreKnown = useMemo(() => {
    const raw = parsed as Record<string, unknown> | null | undefined;
    const s = (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? parsed?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s);
  }, [parsed]);

  const rebuildScore = Math.max(10, Math.round(plan?.rebuild_score ?? 10));

  const rebuildScoreKnown = useMemo(() => {
    return Number.isFinite(rebuildScore);
  }, [rebuildScore]);

  const factors = useMemo(() => {
    const raw = parsed as Record<string, unknown> | null | undefined;
    return normalizeScoreFactors(raw?.score_factors ?? parsed?.score?.score_factors);
  }, [parsed]);
  const focusBullets = useMemo(
    () => computeFocusBulletsForDisplay(plan, parsed, blueprint?.current_month),
    [blueprint?.current_month, plan, parsed],
  );
  const scoreSummaryText = useMemo(() => normalizeSentenceCapitalization(plan?.score_summary), [plan?.score_summary]);
  const scoreSummaryParts = useMemo(() => {
    const [visibleRaw, ...detailRest] = scoreSummaryText.split("|||");
    const visible = visibleRaw.trim();
    const detail = detailRest.join("|||").trim();
    return {
      visible: visible || scoreSummaryText,
      detail,
      hasDetail: detail.length > 0,
    };
  }, [scoreSummaryText]);

  const programMonth = normalizeProgramMonth(blueprint?.current_month);

  const monthlyProgramActions: MonthlyProgramAction[] = useMemo(() => {
    if (!blueprint || !parsed) return [];
    if (programMonth === 1) {
      return buildFoundationMonthActions(parsed);
    }
    if (programMonth >= 2 && programMonth <= MAX_THEMED_PROGRAM_MONTH) {
      const raw = monthlyPlanRow?.actions;
      if (!Array.isArray(raw) || raw.length === 0) return [];
      const out: MonthlyProgramAction[] = [];
      for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const action = typeof o.action === "string" ? o.action.trim() : "";
        const impact = typeof o.impact === "string" ? o.impact.trim() : "Medium impact";
        const timeline = typeof o.timeline === "string" ? o.timeline.trim() : "This month";
        if (action) out.push({ action, impact, timeline });
        if (out.length >= 3) break;
      }
      return out.slice(0, 3);
    }
    return [];
  }, [blueprint, parsed, programMonth, monthlyPlanRow?.actions]);

  const allCurrentMonthActionsDone = useMemo(() => {
    if (monthlyProgramActions.length < 3) return false;
    return [0, 1, 2].every((i) => completedSet.has(i));
  }, [monthlyProgramActions.length, completedSet]);

  const nextUnlockMeta = useMemo(() => {
    if (!blueprint || programMonth >= 5) {
      return { daysRemaining: null as number | null, unlockAtMs: null as number | null, nextMonth: null as number | null };
    }
    const createdMs = new Date(blueprint.created_at).getTime();
    const unlockedAt = blueprint.month_unlocked_at ?? blueprint.created_at;
    const unlockedMs = new Date(unlockedAt).getTime();
    const gateMs = programMonth === 1 ? createdMs : unlockedMs;
    if (!Number.isFinite(gateMs)) {
      return { daysRemaining: null, unlockAtMs: null, nextMonth: programMonth + 1 };
    }
    const unlockAtMs = gateMs + TWENTY_EIGHT_DAYS_MS;
    const daysRemaining = Math.max(0, Math.ceil((unlockAtMs - Date.now()) / (24 * 60 * 60 * 1000)));
    return { daysRemaining, unlockAtMs, nextMonth: programMonth + 1 };
  }, [blueprint, programMonth]);

  const runSyncProgress = useCallback(async () => {
    if (!user?.id) return;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${origin}/api/monthly-progress/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const j = (await res.json()) as {
      ok?: boolean;
      updated?: boolean;
      advancedToMonth?: number | null;
      theme?: string | null;
    };
    if (!j.ok) return;
    if (j.advancedToMonth != null && typeof j.theme === "string") {
      setCelebration({ month: j.advancedToMonth, theme: j.theme });
    }
    if (j.updated) {
      await load();
    }
  }, [load, user?.id]);

  useEffect(() => {
    if (!blueprint?.id || !user?.id) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await runSyncProgress();
    })();
    return () => {
      cancelled = true;
    };
  }, [blueprint?.id, user?.id, runSyncProgress]);

  const saveCompletion = useCallback(
    async (index: number, action: MonthlyProgramAction) => {
      if (!user?.id || !blueprint?.id) return;
      const clientId = user.id;
      const blueprintId = blueprint.id;
      const pm = normalizeProgramMonth(blueprint.current_month);

      if (completionsRef.current.has(index)) {
        completionsRef.current.delete(index);
        const { error } = await supabase
          .from("action_completions")
          .delete()
          .eq("client_id", clientId)
          .eq("blueprint_id", blueprintId)
          .eq("action_index", index)
          .eq("program_month", pm);
        if (error) {
          logPostgrestError("[blueprint] action_completions delete failed", error, {
            client_id: clientId,
            blueprint_id: blueprintId,
            program_month: pm,
            action_index: index,
          });
          completionsRef.current.add(index);
          return;
        }
        setCompletedSet((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        void runSyncProgress();
        return;
      }

      completionsRef.current.add(index);
      const actionText = typeof action?.action === "string" ? action.action : formatDisplay(action?.action);
      const completedAt = new Date().toISOString();
      const match = {
        client_id: clientId,
        blueprint_id: blueprintId,
        program_month: pm,
        action_index: index,
      };

      const { data: blueprintRow, error: blueprintLookupErr } = await supabase
        .from("blueprints")
        .select("id")
        .eq("id", blueprintId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (blueprintLookupErr) {
        logPostgrestError("[blueprint] blueprints lookup failed (before action_completions save)", blueprintLookupErr, {
          client_id: clientId,
          blueprint_id: blueprintId,
        });
        completionsRef.current.delete(index);
        return;
      }
      if (!blueprintRow) {
        console.error(
          "[blueprint] action_completions: no blueprint row for this client (FK on blueprint_id would fail on insert)",
          { client_id: clientId, blueprint_id: blueprintId },
        );
        completionsRef.current.delete(index);
        return;
      }

      const { data: existingRow, error: selectErr } = await supabase
        .from("action_completions")
        .select("id")
        .match(match)
        .maybeSingle();
      if (selectErr) {
        logPostgrestError("[blueprint] action_completions lookup failed", selectErr, {
          client_id: clientId,
          blueprint_id: blueprintId,
          program_month: pm,
          action_index: index,
        });
        completionsRef.current.delete(index);
        return;
      }
      const rowId = (existingRow as { id?: string } | null)?.id;
      const { error } = rowId
        ? await supabase
            .from("action_completions")
            .update({ action_text: actionText, completed_at: completedAt })
            .eq("id", rowId)
        : await supabase.from("action_completions").insert({
            ...match,
            action_text: actionText,
            completed_at: completedAt,
          });
      if (error) {
        logPostgrestError("[blueprint] action_completions insert/update failed", error, {
          client_id: clientId,
          blueprint_id: blueprintId,
          program_month: pm,
          action_index: index,
          row_id: rowId ?? null,
          op: rowId ? "update" : "insert",
        });
        completionsRef.current.delete(index);
        return;
      }
      setCompletedSet((prev) => new Set([...prev, index]));
      void runSyncProgress();
    },
    [blueprint, user, runSyncProgress],
  );

  const handleDownloadPdf = useCallback(() => {
    if (!blueprint || !parsed) return;

    void (async () => {
      let logoDataUrl = "";
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${origin}/Teal%20Logo.png`);
        if (res.ok) {
          const blob = await res.blob();
          const buf = await blob.arrayBuffer();
          const mime = blob.type || "image/png";
          logoDataUrl = `data:${mime};base64,${uint8ArrayToBase64(new Uint8Array(buf))}`;
        }
      } catch {
        /* text fallback below */
      }

      const logoLeftHtml = logoDataUrl
        ? `<img src="${logoDataUrl}" alt="Credit Path Canada" class="pdf-logo" />`
        : `<span class="pdf-brand">Credit Path Canada</span>`;

      const reportTitle = "Credit Path Canada - Credit Blueprint";
      const clientName = formatDisplay(parsed.personal?.name || user?.user_metadata?.full_name || user?.email || "Client");
      const monthNumber = blueprint.month_number;
      const primaryGoal = formatDisplay(user?.user_metadata?.primary_goal || "Not set");
      const rebuildScoreValue = rebuildScoreKnown ? String(rebuildScore) : "—";
      const rebuildScoreLabel = hasPlan
        ? formatDisplay(plan?.rebuild_score_label)
        : `Overall grade ${scoreToLetterGrade(equifaxScore)}`;
      const focusText = hasPlan ? formatDisplay(plan?.this_months_focus) : "Focus not available yet.";
      const topActions = monthlyProgramActions;
      const focusItems = hasPlan
        ? computeFocusBulletsForDisplay(plan, parsed, blueprint?.current_month)
        : splitFocusIntoBullets(focusText);
      const summary = parsed.summary ?? {};
      const collectionRows = (Array.isArray(parsed.collections) ? parsed.collections : []).slice(0, 8);
      const timelineRows = Array.from({ length: 24 }, (_, idx) => idx + 1)
        .map((month) => {
          if (month <= 3) return `<div class="month month-active">Month ${month}</div>`;
          return `<div class="month month-locked">Month ${month}<span class="month-tag">Locked</span></div>`;
        })
        .join("");

      const actionsHtml =
        topActions.length === 0
          ? `<li class="action-item"><div><strong>No priority actions available yet.</strong></div></li>`
          : topActions
              .map((item, idx) => {
                const action = escapeHtml(formatDisplay(item.action));
                const impact = escapeHtml(formatDisplay(item.impact));
                const timeline = escapeHtml(formatDisplay(item.timeline));
                const meta = [impact, timeline].filter((x) => x !== "—").join(" · ");
                return `<li class="action-item"><span class="action-number">${idx + 1}</span><div><strong>${action}</strong>${meta ? `<p>${meta}</p>` : ""}</div></li>`;
              })
              .join("");

      const collectionCardsHtml =
        collectionRows.length === 0
          ? `<div class="card">No active collections were detected in this snapshot.</div>`
          : collectionRows
              .map((item) => {
                const creditor = escapeHtml(formatDisplay(item.creditor));
                const amount = escapeHtml(formatCurrency(item.amount));
                const recommendation = escapeHtml(formatDisplay(item.recommendation));
                const months = monthsToFalloffValue(item.months_to_falloff);
                const letFallOff = months !== null && months <= 24;
                const cardClass = letFallOff ? "collection-card collection-card-amber" : "collection-card collection-card-red";
                const badge = letFallOff ? "Let Fall Off" : "Action Required";
                return `<div class="${cardClass}">
                  <div class="collection-top">
                    <strong>${creditor}</strong><span>${amount}</span>
                  </div>
                  <span class="collection-badge">${badge}</span>
                  <p>${recommendation}</p>
                  ${
                    months !== null
                      ? `<p class="collection-meta"><strong>Months to fall-off:</strong> ${months}</p>`
                      : ""
                  }
                </div>`;
              })
              .join("");
      const focusListHtml =
        focusItems.length > 0
          ? focusItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
          : `<li>${escapeHtml(focusText)}</li>`;
      const factorsHtml =
        factors.length > 0
          ? factors
              .map(
                (f) =>
                  `<li class="factor-row"><span>${escapeHtml(f.text)}</span><span class="factor-grade">${escapeHtml(
                    f.grade,
                  )}</span></li>`,
              )
              .join("")
          : `<li class="factor-row"><span>No score factors available.</span><span class="factor-grade">—</span></li>`;

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&amp;display=swap" />
  <style>
    @page { size: Letter; margin: 0.45in; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; color: #0F1923; background: #edf1f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { min-height: 10.1in; display: flex; flex-direction: column; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 24px rgba(15,25,35,0.08); }
    .page + .page { page-break-before: always; margin-top: 0; }
    .pdf-header { background: #0F1923; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; gap: 12px; }
    .pdf-header-left { display: flex; align-items: center; min-width: 0; flex-shrink: 0; }
    .pdf-logo { height: 28px; width: auto; max-width: 180px; object-fit: contain; display: block; }
    .pdf-brand { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0; font-family: 'Montserrat', 'Segoe UI', sans-serif; }
    .pdf-page-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.92); text-align: right; line-height: 1.35; max-width: 58%; font-family: 'Montserrat', 'Segoe UI', sans-serif; }
    .pdf-accent { height: 3px; background: #00C9A7; width: 100%; flex-shrink: 0; }
    .pdf-body { padding: 12px 14px 4px; flex: 1; display: flex; flex-direction: column; }
    .section-kicker { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: #00C9A7; margin: 0 0 6px; font-family: 'Montserrat', 'Segoe UI', sans-serif; }
    .section-title { font-size: 20px; font-weight: 700; color: #0F1923; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.2; font-family: 'Montserrat', 'Segoe UI', sans-serif; }
    .section-title-sm { font-size: 15px; font-weight: 700; color: #0F1923; margin: 10px 0 6px; letter-spacing: -0.01em; font-family: 'Montserrat', 'Segoe UI', sans-serif; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { border: 1px solid rgba(15,25,35,0.08); border-radius: 12px; padding: 10px 12px; background: #fff; box-shadow: 0 2px 12px rgba(15,25,35,0.06); font-size: 12px; line-height: 1.4; }
    .card .card-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(15,25,35,0.5); margin-bottom: 8px; font-weight: 700; }
    .card-score { margin-top: 14px; }
    .card-score .card-h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(15,25,35,0.5); margin: 0 0 8px; font-weight: 700; }
    .focus { border: 2px solid #00C9A7; background: linear-gradient(165deg, rgba(0,201,167,0.14) 0%, rgba(0,201,167,0.05) 100%); border-radius: 12px; padding: 14px 16px; font-size: 13px; line-height: 1.45; font-weight: 500; color: #0F1923; box-shadow: 0 6px 20px rgba(0,201,167,0.12); }
    ul, ol { margin: 8px 0 0; padding-left: 20px; }
    li { margin-bottom: 10px; line-height: 1.45; font-size: 13px; color: #0F1923; }
    .score { font-size: 32px; font-weight: 800; color: #00C9A7; line-height: 1; letter-spacing: -0.02em; }
    .score-caption { margin-top: 8px; font-size: 13px; color: rgba(15,25,35,0.78); line-height: 1.4; }
    .muted { color: rgba(15,25,35,0.65); font-size: 12px; line-height: 1.45; }
    .timeline { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
    .month { border-radius: 10px; padding: 8px 6px; border: 1px solid rgba(15,25,35,0.1); font-size: 10px; text-align: center; background: #fff; box-shadow: 0 1px 4px rgba(15,25,35,0.05); }
    .month-active { background: rgba(0,201,167,0.14); border-color: #00C9A7; font-weight: 700; }
    .month-locked { background: rgba(15,25,35,0.06); color: rgba(15,25,35,0.42); }
    .month-tag { display: block; font-size: 9px; margin-top: 3px; font-weight: 600; color: rgba(15,25,35,0.55); }
    .footer { margin-top: auto; padding: 10px 14px 12px; border-top: 1px solid rgba(15,25,35,0.1); font-size: 10px; color: rgba(15,25,35,0.62); text-align: center; background: #fafbfc; }
    .section-title-teal { color: #00C9A7; }
    .section-title-navy { color: #0F1923; }
    .cover-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 10px; align-items: center; }
    .score-circle { width: 140px; height: 140px; border-radius: 9999px; border: 8px solid #00C9A7; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; margin: 0 auto; }
    .score-circle strong { font-size: 34px; color: #00C9A7; line-height: 1; }
    .score-circle span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(15,25,35,0.65); margin-top: 6px; }
    .action-item { list-style: none; display: grid; grid-template-columns: 22px 1fr; gap: 8px; padding: 6px 0; margin: 0; }
    .action-number { width: 22px; height: 22px; border-radius: 9999px; background: rgba(0,201,167,0.14); color: #0F1923; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-top: 1px; }
    .action-item p { margin: 4px 0 0; font-size: 11px; color: rgba(15,25,35,0.75); }
    .factor-list { margin: 8px 0 0; padding: 0; list-style: none; }
    .factor-row { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(15,25,35,0.08); padding: 6px 0; margin: 0; }
    .factor-grade { min-width: 26px; text-align: center; border-radius: 6px; background: rgba(0,201,167,0.16); color: #0F1923; font-weight: 700; font-size: 11px; padding: 2px 0; }
    .collection-card { border: 1px solid rgba(15,25,35,0.08); border-left-width: 4px; border-radius: 10px; padding: 10px 12px; margin-top: 8px; }
    .collection-card-amber { background: rgba(245,158,11,0.09); border-left-color: #d97706; }
    .collection-card-red { background: rgba(239,68,68,0.08); border-left-color: #b91c1c; }
    .collection-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; font-size: 13px; }
    .collection-badge { display: inline-block; margin-top: 6px; border-radius: 9999px; padding: 2px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: rgba(15,25,35,0.1); color: #0F1923; }
    .collection-meta { margin-top: 6px; font-size: 11px; color: rgba(15,25,35,0.72); }
    .motivation { margin-top: 14px; border-radius: 10px; border: 1px solid rgba(0,201,167,0.45); background: rgba(0,201,167,0.08); padding: 10px 12px; font-size: 13px; line-height: 1.45; color: #0F1923; }
  </style>
</head>
<body>
  <section class="page">
    <header class="pdf-header">
      <div class="pdf-header-left">${logoLeftHtml}</div>
      <span class="pdf-page-title">Premium Credit Coaching Report</span>
    </header>
    <div class="pdf-accent"></div>
    <div class="pdf-body">
      <p class="section-kicker">Credit Path Canada</p>
      <h1 class="section-title section-title-navy">Your personalized blueprint</h1>
      <div class="cover-grid">
        <div class="focus">
          <strong style="font-size:20px;color:#00C9A7;">${escapeHtml(clientName)}</strong><br/>
          <strong>Primary goal:</strong> ${escapeHtml(primaryGoal)}<br/>
          <strong>Month:</strong> ${monthNumber}<br/>
          <span class="muted">Your plan is ready. Follow it and your credit future changes.</span>
        </div>
        <div class="score-circle">
          <strong>${escapeHtml(rebuildScoreValue)}</strong>
          <span>Rebuild score</span>
        </div>
      </div>
      <div class="card" style="margin-top:10px;">
        <span class="card-label">Current coaching status</span>${escapeHtml(rebuildScoreLabel)}
      </div>
    </div>
    <div class="footer">Credit Path Canada · Generated fresh from latest upload</div>
  </section>

  <section class="page">
    <header class="pdf-header">
      <div class="pdf-header-left">${logoLeftHtml}</div>
      <span class="pdf-page-title">Focus &amp; priority actions</span>
    </header>
    <div class="pdf-accent"></div>
    <div class="pdf-body">
      <p class="section-kicker">This month</p>
      <h1 class="section-title section-title-teal">This month's focus</h1>
      <ul>${focusListHtml}</ul>
      <h2 class="section-title-sm">Top 5 priority actions</h2>
      <ol>${actionsHtml}</ol>
      ${
        hasPlan && plan?.pre_auth_required
          ? `<div class="focus" style="margin-top:10px;"><strong>Pre-authorized payments reminder:</strong> Set pre-auth on every account immediately to protect payment history.</div>`
          : ""
      }
    </div>
    <div class="footer">Credit Path Canada · Prioritized to maximize monthly score impact</div>
  </section>

  <section class="page">
    <header class="pdf-header">
      <div class="pdf-header-left">${logoLeftHtml}</div>
      <span class="pdf-page-title">Bureau health</span>
    </header>
    <div class="pdf-accent"></div>
    <div class="pdf-body">
      <p class="section-kicker">Snapshot</p>
      <h1 class="section-title section-title-navy">Bureau health</h1>
      <div class="grid-2">
        <div class="card"><span class="card-label">Utilization</span>${escapeHtml(formatPercent(summary.utilization_percentage))}</div>
        <div class="card"><span class="card-label">On-time payment rate</span>${escapeHtml(formatPercent(summary.on_time_payment_percentage))}</div>
        <div class="card"><span class="card-label">Derogatory marks</span>${escapeHtml(formatDisplay(summary.derogatory_marks))}</div>
        <div class="card"><span class="card-label">Hard inquiries (12 mo)</span>${escapeHtml(formatDisplay(summary.hard_inquiries_12mo))}</div>
      </div>
      <div class="grid-2" style="margin-top:10px;">
        <div class="card">
          <span class="card-label">Score factors</span>
          <ul class="factor-list">${factorsHtml}</ul>
        </div>
        <div class="card">
          <span class="card-label">Account summary</span>
          <p><strong>Total accounts:</strong> ${escapeHtml(formatDisplay(summary.total_accounts))}</p>
          <p><strong>Open accounts:</strong> ${escapeHtml(formatDisplay(summary.open_accounts))}</p>
          <p><strong>Status:</strong> ${escapeHtml(formatDisplay(blueprint.status))}</p>
        </div>
      </div>
    </div>
    <div class="footer">Credit Path Canada · Bureau health overview</div>
  </section>

  <section class="page">
    <header class="pdf-header">
      <div class="pdf-header-left">${logoLeftHtml}</div>
      <span class="pdf-page-title">Collections</span>
    </header>
    <div class="pdf-accent"></div>
    <div class="pdf-body">
      <p class="section-kicker">Strategy</p>
      <h1 class="section-title section-title-navy">Collections overview</h1>
      <div>${collectionCardsHtml}</div>
      <p class="muted" style="margin-top:10px;">Amber cards are typically best to let age off. Red cards need action planning now.</p>
    </div>
    <div class="footer">Credit Path Canada · Collection strategy without tradeline-level disclosure</div>
  </section>

  <section class="page">
    <header class="pdf-header">
      <div class="pdf-header-left">${logoLeftHtml}</div>
      <span class="pdf-page-title">24-month timeline</span>
    </header>
    <div class="pdf-accent"></div>
    <div class="pdf-body">
      <p class="section-kicker">Program</p>
      <h1 class="section-title section-title-teal">Your 24-month path</h1>
      <p class="muted">Month 1–3 are active now. Remaining months stay locked until your progress unlocks them.</p>
      <div class="timeline">${timelineRows}</div>
      <p class="motivation">Stay consistent. Every payment. Every month. Credit Path Canada is with you.</p>
    </div>
    <div class="footer">Credit Path Canada · Stay consistent month-to-month for best results</div>
  </section>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "credit-blueprint.html";
      a.click();
      URL.revokeObjectURL(url);
    })();
  }, [
    blueprint,
    equifaxScore,
    factors,
    hasPlan,
    parsed,
    plan,
    rebuildScore,
    rebuildScoreKnown,
    monthlyProgramActions,
    user?.email,
    user?.user_metadata?.full_name,
    user?.user_metadata?.primary_goal,
  ]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tradelines", label: "Tradelines" },
    { id: "collections", label: "Collections" },
    { id: "errors", label: "Errors & Disputes" },
  ];

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading session"
        />
        <p className={`text-sm opacity-70 ${h}`}>Checking your session…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading blueprint"
        />
        <p className={`text-sm opacity-70 ${h}`}>Loading blueprint…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" style={{ color: NAVY }}>
        <h1 className={`text-2xl font-bold ${h}`}>Blueprint</h1>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" style={{ color: NAVY }}>
        <h1 className={`text-2xl font-bold ${h}`}>Blueprint</h1>
        <p className="text-sm opacity-75">
          No blueprint found yet. Upload your bureau report to generate one.
        </p>
        <Link
          href="/dashboard/upload"
          className="inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-[#0F1923]"
          style={{ backgroundColor: TEAL }}
        >
          Go to upload
        </Link>
      </div>
    );
  }

  if (showProcessing) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-6 rounded-2xl border border-black/5 bg-white px-8 py-16 text-center shadow-sm">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Preparing blueprint"
        />
        <div>
          <h1 className={`text-xl font-bold ${h}`} style={{ color: NAVY }}>
            Your Blueprint is being prepared…
          </h1>
          <p className="mt-2 text-sm opacity-70">We&apos;ll refresh this page as soon as your data is ready.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-semibold underline decoration-2 underline-offset-4"
          style={{ color: TEAL }}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!showTabs || !parsed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" style={{ color: NAVY }}>
        <h1 className={`text-2xl font-bold ${h}`}>Blueprint</h1>
        <p className="text-sm opacity-75">Blueprint data is not available yet.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-semibold"
          style={{ color: TEAL }}
        >
          Try again
        </button>
      </div>
    );
  }

  const s = parsed.summary ?? {};
  const tradelines = Array.isArray(parsed.tradelines) ? parsed.tradelines : [];
  const collections = Array.isArray(parsed.collections) ? parsed.collections : [];
  const errors = Array.isArray(parsed.errors_detected) ? parsed.errors_detected : [];
  const revolvingNetworkCount = countNetworkCardsTowardMinimum(tradelines);
  const recommendedProducts = [...CREDIT_PRODUCT_OFFERS];

  return (
    <div className="mx-auto max-w-5xl space-y-8" style={{ color: NAVY }}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>Your Blueprint</h1>
          {parsed.personal?.name ? (
            <p className="mt-1 text-sm opacity-70">{formatDisplay(parsed.personal.name)}</p>
          ) : null}
        </div>
        <span
          className="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ borderColor: TEAL, color: TEAL, backgroundColor: "rgba(0, 201, 167, 0.1)" }}
        >
          Program month {programMonth} · {blueprint.status}
        </span>
      </header>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleDownloadPdf}
          className={`inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold ${h}`}
          style={{ backgroundColor: TEAL, color: NAVY }}
        >
          Download PDF Blueprint
        </button>
      </div>

      {parsed?.dnq ? (
        <div
          className="rounded-2xl border-2 px-5 py-4 text-sm font-semibold shadow-sm"
          style={{ borderColor: "#b91c1c", backgroundColor: "rgba(220, 38, 38, 0.08)", color: "#7f1d1d" }}
          role="alert"
        >
          <p className={`text-base font-bold ${h}`}>Does not qualify at this time</p>
          <p className="mt-1 font-medium leading-relaxed">{formatDisplay(parsed.dnq_reason)}</p>
        </div>
      ) : null}

      <div
        className="flex flex-wrap gap-2 border-b border-black/10 pb-1"
        role="tablist"
        aria-label="Blueprint sections"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${h}`}
              style={{
                color: active ? NAVY : "rgba(15, 25, 35, 0.55)",
                borderBottom: active ? `3px solid ${TEAL}` : "3px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[320px]">
        {tab === "overview" && (
          <div className="space-y-8">
            {hasPlan && (plan?.this_months_focus || plan?.pre_auth_required) ? (
              <section
                className="rounded-2xl border-2 px-6 py-5 shadow-sm"
                style={{
                  borderColor: TEAL,
                  backgroundColor: "rgba(0, 201, 167, 0.1)",
                  color: NAVY,
                }}
              >
                <p className={`text-xs font-bold uppercase tracking-wide ${h}`} style={{ color: TEAL, marginBottom: 12 }}>
                  This month&apos;s focus
                </p>
                {plan?.this_months_focus ? (
                  (() => {
                    const raw = plan?.this_months_focus ?? "";
                    let bullets = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
                    if (bullets.length === 1) {
                      bullets = raw.split(/(?<=[.!])\s+/).map(s => s.trim()).filter(Boolean);
                    }
                    bullets = bullets.slice(0, 3);
                    return (
                      <ol style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
                        {bullets.map((b, i) => (
                          <li
                            key={i}
                            style={{
                              marginBottom: 10,
                              lineHeight: 1.6,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                color: "#00C9A7",
                                fontWeight: 700,
                                fontSize: 16,
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            >
                              {i + 1}.
                            </span>
                            <span style={{ fontWeight: 600 }}>{b.replace(/^[-•]\s*/, "")}</span>
                          </li>
                        ))}
                      </ol>
                    );
                  })()
                ) : null}
                <div className="mt-5 border-t pt-5" style={{ borderColor: "rgba(15, 25, 35, 0.12)" }} role="alert">
                  <div
                    className="rounded-xl border-l-4 p-4 shadow-sm"
                    style={{ backgroundColor: NAVY, borderLeftColor: TEAL, color: "#E9F5F3" }}
                  >
                    <p className={`text-sm font-semibold leading-relaxed ${h}`}>
                      Important: Do not apply for credit anywhere without contacting us first. Every application is a
                      hard inquiry that damages your score and could delay your approval. We are your credit specialist
                      — reach out before you act.
                    </p>
                  </div>
                </div>
                {plan?.pre_auth_required ? (
                  <div
                    className="mt-5 border-t pt-5"
                    style={{ borderColor: "rgba(15, 25, 35, 0.12)" }}
                    role="status"
                  >
                    <div className="rounded-xl border border-amber-200/90 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
                      <p className={`font-bold ${h}`}>Pre-authorized payments</p>
                      <p className={`mt-1 font-semibold leading-relaxed ${h}`} style={{ opacity: 0.9 }}>
                        Your bureau shows late payment history. Set up pre-authorized payments on every account so nothing
                        slips — this is the fastest way to stabilize your score.
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {hasPlan &&
            plan?.auto_ready_alert &&
            typeof plan.readiness_percentage === "number" &&
            Number.isFinite(plan.readiness_percentage) ? (
              <section
                className="rounded-2xl border-2 px-5 py-4 shadow-sm"
                style={{ borderColor: TEAL, backgroundColor: "rgba(0, 201, 167, 0.12)", color: NAVY }}
                role="status"
              >
                <p className={`text-sm font-bold uppercase tracking-wide ${h}`} style={{ color: TEAL }}>
                  Auto loan readiness
                </p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${h}`}>
                  {Math.round(Math.min(100, Math.max(0, plan.readiness_percentage)))}%
                </p>
                <p className="mt-2 text-sm leading-relaxed opacity-90">
                  You&apos;ve crossed the readiness threshold we track for auto financing goals. Our team has been
                  notified to follow up when appropriate.
                </p>
              </section>
            ) : null}

            <section
              className="grid grid-cols-1 items-center gap-6 rounded-2xl px-6 py-10 shadow-lg sm:grid-cols-[35%_65%] sm:px-10"
              style={{ backgroundColor: NAVY, color: "#fff" }}
            >
              <div className="mx-auto flex shrink-0 justify-center sm:mx-0 sm:justify-center">
                {hasPlan ? (
                  <ScoreRing
                    score={rebuildScoreKnown ? rebuildScore : 0}
                    maxScore={100}
                    centerValue={rebuildScoreKnown ? String(rebuildScore) : "—"}
                    subLabel="Rebuild score"
                    headingFontClass={h}
                  />
                ) : (
                  <ScoreRing
                    score={equifaxScoreKnown ? equifaxScore : 0}
                    maxScore={850}
                    centerValue={equifaxScoreKnown ? String(equifaxScore) : "—"}
                    subLabel="Equifax score"
                    headingFontClass={h}
                  />
                )}
              </div>
              <div className="w-full min-w-0 space-y-2" style={{ textAlign: "left", paddingLeft: 16 }}>
                {hasPlan ? (
                  <>
                    <p className={`text-lg font-semibold ${h}`} style={{ color: TEAL }}>
                      {formatDisplay(plan?.rebuild_score_label)}
                    </p>
                    <p className="leading-relaxed text-white/85" style={{ fontSize: 14 }}>
                      {scoreSummaryParts.visible}
                    </p>
                    {scoreSummaryParts.hasDetail ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowScoreSummaryDetail((v) => !v)}
                          className="mt-1 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm font-semibold"
                          style={{ color: TEAL }}
                        >
                          <span
                            aria-hidden
                            className={`inline-block transition-transform duration-200 ${
                              showScoreSummaryDetail ? "rotate-90" : "rotate-0"
                            }`}
                          >
                            ▸
                          </span>
                          Read more
                        </button>
                        {showScoreSummaryDetail ? (
                          <p className="leading-relaxed text-white/65" style={{ fontSize: 13 }}>
                            {scoreSummaryParts.detail}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className={`text-lg font-semibold ${h}`} style={{ color: TEAL }}>
                      Overall grade {equifaxScoreKnown ? scoreToLetterGrade(equifaxScore) : "—"}
                    </p>
                    <p className="text-white/75" style={{ fontSize: 14 }}>
                      Based on your Equifax bureau snapshot. Follow your monthly actions to improve over your 24-month
                      program.
                    </p>
                  </>
                )}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Utilization", value: formatDisplay(s.utilization_percentage), suffix: "%" },
                { label: "On-time payments", value: formatDisplay(s.on_time_payment_percentage), suffix: "%" },
                { label: "Derogatory marks", value: formatDisplay(s.derogatory_marks), suffix: "" },
                { label: "Hard inquiries (12 mo)", value: formatDisplay(s.hard_inquiries_12mo), suffix: "" },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                  style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
                >
                  <p className={`text-xs font-semibold uppercase tracking-wide text-[#0F1923]/60 ${h}`}>{k.label}</p>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${h}`}>
                    {k.value}
                    {k.suffix && k.value !== "—" ? k.suffix : ""}
                  </p>
                </div>
              ))}
            </section>

            {celebration ? (
              <div
                className="rounded-2xl border-2 px-5 py-4 shadow-sm"
                style={{ borderColor: TEAL, backgroundColor: "rgba(0, 201, 167, 0.14)", color: NAVY }}
                role="status"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`text-base font-bold leading-snug ${h}`}>
                    Month {celebration.month} Unlocked! Your new focus: {celebration.theme}
                  </p>
                  <button
                    type="button"
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold ${h}`}
                    style={{ borderColor: NAVY, color: NAVY }}
                    onClick={() => setCelebration(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            {programMonth >= 5 ? (
              <section
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
              >
                <h2 className={`text-lg font-bold ${h}`}>Program progression</h2>
                <p className={`mt-2 text-sm leading-relaxed text-[#0F1923]/75 ${h}`}>
                  {getProgramMonthThemeTitle(programMonth)} — {getProgramMonthThemeSubtitle(programMonth)}
                </p>
              </section>
            ) : (
              <section
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
              >
                <h2 className={`text-lg font-bold ${h}`}>Top actions</h2>
                <p className="mt-1 text-sm text-[#0F1923]/65">
                  Check each action when complete to track your progress.
                </p>
                <p className={`mt-3 text-base font-bold leading-snug ${h}`} style={{ color: TEAL }}>
                  Month {programMonth}: {getProgramMonthThemeTitle(programMonth)}
                </p>
                <p className={`mt-1 text-sm leading-relaxed text-[#0F1923]/70 ${h}`}>
                  {getProgramMonthThemeSubtitle(programMonth)}
                </p>

                {nextUnlockMeta.nextMonth != null && programMonth < 5 ? (
                  <p className="mt-4 rounded-xl border border-black/10 bg-[#F5F7FA] px-4 py-3 text-sm leading-relaxed text-[#0F1923]/75">
                    Month {nextUnlockMeta.nextMonth} unlocks when all actions are complete and 28 days have passed.
                  </p>
                ) : null}

                {allCurrentMonthActionsDone &&
                nextUnlockMeta.daysRemaining != null &&
                nextUnlockMeta.daysRemaining > 0 &&
                nextUnlockMeta.nextMonth != null ? (
                  <p
                    className={`mt-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold leading-relaxed ${h}`}
                    style={{ borderColor: TEAL, backgroundColor: "rgba(0, 201, 167, 0.1)", color: NAVY }}
                    role="status"
                  >
                    {nextUnlockMeta.daysRemaining} day{nextUnlockMeta.daysRemaining === 1 ? "" : "s"} remaining until
                    Month {nextUnlockMeta.nextMonth} unlocks
                  </p>
                ) : null}

                {programMonth >= 2 && programMonth <= MAX_THEMED_PROGRAM_MONTH && monthlyProgramActions.length === 0 ? (
                  <p className="mt-4 text-sm text-[#0F1923]/65">
                    Your personalized plan for this month is being prepared. Refresh the page in a moment — if this
                    message persists, contact Credit Path Canada.
                  </p>
                ) : monthlyProgramActions.length > 0 ? (
                  <>
                    <ol className="mt-4 space-y-3">
                      {monthlyProgramActions.map((item, idx) => {
                        const done = completedSet.has(idx);
                        const canSave = Boolean(user?.id && blueprint?.id);
                        const impactLine = [formatDisplay(item.impact), formatDisplay(item.timeline)]
                          .filter((x) => x !== "—")
                          .join(" · ");
                        return (
                          <li
                            key={idx}
                            className="flex items-start gap-3 rounded-xl border border-black/5 bg-white px-3 py-3"
                            style={{
                              borderColor: done ? "rgba(0, 201, 167, 0.45)" : "rgba(15, 25, 35, 0.08)",
                              backgroundColor: done ? "rgba(0, 201, 167, 0.06)" : "#fff",
                            }}
                          >
                            <button
                              type="button"
                              className={`mt-0.5 flex shrink-0 items-center justify-center rounded border text-[13px] font-bold leading-none disabled:cursor-default ${
                                done ? "text-white" : ""
                              }`}
                              style={{
                                width: 24,
                                height: 24,
                                borderColor: done ? TEAL : "var(--cp-border)",
                                backgroundColor: done ? TEAL : "transparent",
                              }}
                              disabled={!canSave}
                              aria-label={done ? "Mark action not complete" : "Mark action complete"}
                              onClick={() => void saveCompletion(idx, item)}
                            >
                              {done ? "✓" : null}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-bold leading-snug ${done ? "line-through" : ""} line-clamp-4 ${h}`}
                                style={{ color: done ? TEAL : NAVY }}
                              >
                                {formatDisplay(item.action)}
                              </p>
                              {impactLine ? (
                                <p
                                  className={`mt-1 text-xs leading-snug text-[#0F1923]/55 ${done ? "line-through" : ""}`}
                                  style={{ color: "#00C9A7" }}
                                >
                                  {impactLine}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-4 text-sm font-semibold" style={{ color: TEAL }}>
                      {completedSet.size} of {monthlyProgramActions.length}{" "}
                      {monthlyProgramActions.length === 1 ? "action" : "actions"} completed this month
                    </p>
                    {completedSet.size === monthlyProgramActions.length ? (
                      <div
                        className="mt-4 rounded-2xl border-2 p-5 shadow-sm"
                        style={{
                          borderColor: TEAL,
                          backgroundColor: "rgba(0, 201, 167, 0.12)",
                          color: NAVY,
                        }}
                        role="status"
                      >
                        <div className="flex gap-4">
                          <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                            style={{ backgroundColor: TEAL }}
                            aria-hidden
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-lg font-bold ${h}`}>You crushed it this month.</p>
                            <p className={`mt-2 text-sm leading-relaxed opacity-90 ${h}`}>
                              Every action completed. Your progress has been recorded. Keep this momentum going into
                              next month.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="mt-6 border-t border-black/10 pt-5">
                  <p className={`text-xs font-bold uppercase tracking-wide text-[#0F1923]/55 ${h}`}>Locked ahead</p>
                  <ul className="mt-2 space-y-2 text-sm text-[#0F1923]/65">
                    {Array.from({ length: Math.max(0, 5 - programMonth) }, (_, i) => programMonth + 1 + i).map((m) => (
                      <li key={m}>
                        <span className="font-semibold text-[#0F1923]/85">Month {m}</span> —{" "}
                        {m >= 5 ? getProgramMonthThemeTitle(5) : "Locked until you complete the prior month and wait window"}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h2 className={`text-lg font-bold ${h}`} style={{ color: NAVY }}>
                Recommended Credit Products
              </h2>
              <p className="rounded-xl border border-[rgba(15,25,35,0.1)] bg-[rgba(0,201,167,0.08)] px-4 py-3 text-sm leading-relaxed text-[#0F1923]/85">
                You currently have {revolvingNetworkCount} revolving credit card
                {revolvingNetworkCount === 1 ? "" : "s"}. We recommend 3 minimum.
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
                {recommendedProducts.map((product) => (
                  <div
                    key={product.name}
                    className="flex min-h-0 flex-1 flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                    style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-base font-bold ${h}`} style={{ color: NAVY }}>
                        {product.name}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/65">{product.description}</p>
                      {product.name === "Tangerine Money-Back Credit Card" ? (
                        <p style={{ color: "#00C9A7", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
                          💸 Use referral code 79976711S1 for a $50 bonus.
                        </p>
                      ) : null}
                    </div>
                    <a
                      href={product.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-[#0F1923] transition-opacity hover:opacity-90"
                      style={{ backgroundColor: TEAL }}
                    >
                      {product.cta}
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
              >
                <h2 className={`text-lg font-bold ${h}`}>Account summary</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-black/5 pb-2">
                    <dt className="opacity-70">Total accounts</dt>
                    <dd className="font-semibold">{formatDisplay(s.total_accounts)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-black/5 pb-2">
                    <dt className="opacity-70">Open accounts</dt>
                    <dd className="font-semibold">{formatDisplay(s.open_accounts)}</dd>
                  </div>
                </dl>
              </div>

              <div
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
              >
                <h2 className={`text-lg font-bold ${h}`}>Score factors</h2>
                {factors.length === 0 ? (
                  <p className="mt-4 text-sm opacity-60">No score factors were returned in this parse.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {factors.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-xl border border-black/5 px-3 py-2.5"
                        style={{ borderColor: "rgba(15, 25, 35, 0.06)" }}
                      >
                        <span className="text-sm leading-snug">{f.text}</span>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${h}`}
                          style={{ backgroundColor: "rgba(0, 201, 167, 0.15)", color: NAVY }}
                        >
                          {f.grade}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "tradelines" && (
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10" style={{ backgroundColor: "rgba(15, 25, 35, 0.04)" }}>
                  {["Creditor", "Network", "Balance", "Util.", "30/60/90", "Payment status", "Action"].map((col) => (
                    <th key={col} className={`whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide ${h}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tradelines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm opacity-60">
                      No tradelines in this report.
                    </td>
                  </tr>
                ) : (
                  tradelines.map((row, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3 font-medium">{formatDisplay(row.creditor_name)}</td>
                      <td className="px-4 py-3 capitalize">{formatDisplay(row.network)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDisplay(row.balance)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatPercent(row.utilization)}</td>
                      <td className="px-4 py-3 tabular-nums text-xs">
                        {formatDisplay(row.late_30)}/{formatDisplay(row.late_60)}/{formatDisplay(row.late_90)}
                      </td>
                      <td className="px-4 py-3">{formatDisplay(row.payment_status)}</td>
                      <td className="px-4 py-3 text-[#0F1923]/80">{formatDisplay(row.action_recommended)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "collections" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                Let Fall Off
              </span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                Action Required
              </span>
            </div>
            <ul className="space-y-4">
              {collections.length === 0 ? (
                <li className="rounded-2xl border border-black/5 bg-white px-6 py-10 text-center text-sm opacity-60 shadow-sm">
                  No collections reported.
                </li>
              ) : (
                collections.map((c, i) => {
                  const months = monthsToFalloffValue(c.months_to_falloff);
                  const letFallOff = months !== null && months <= 24;
                  const leftBorder = letFallOff ? "#d97706" : "#b91c1c";
                  const bg = letFallOff ? "rgba(245, 158, 11, 0.10)" : "rgba(239, 68, 68, 0.08)";
                  const badgeText = letFallOff ? "Let Fall Off" : "Action Required";
                  const badgeBg = letFallOff ? "#FEF3C7" : "#FEE2E2";
                  const badgeColor = letFallOff ? "#92400E" : "#991B1B";
                  const hasLastActivity = formatDisplay(c.date_of_last_activity) !== "—";
                  const hasFalloffDate = formatDisplay(c.estimated_falloff_date) !== "—";
                  const hasMonthsToFalloff = formatDisplay(c.months_to_falloff) !== "—";
                  const hasStatus = formatDisplay(c.status) !== "—";
                  const showDetails = hasLastActivity || hasFalloffDate || hasMonthsToFalloff || hasStatus;
                  return (
                    <li
                      key={i}
                      className="rounded-2xl border border-l-4 p-5 shadow-sm"
                      style={{ borderColor: "rgba(15, 25, 35, 0.08)", borderLeftColor: leftBorder, backgroundColor: bg }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className={`text-base font-bold ${h}`}>{formatDisplay(c.creditor)}</h3>
                        <span className="text-lg font-semibold tabular-nums" style={{ color: NAVY }}>
                          {formatCurrency(c.amount)}
                        </span>
                      </div>
                      <span
                        className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                      >
                        {badgeText}
                      </span>
                      <p className="mt-2 text-sm leading-relaxed opacity-80">{formatDisplay(c.recommendation)}</p>
                      {showDetails ? (
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-xs text-[#0F1923]/75">
                          {hasLastActivity ? (
                            <div className="min-w-0">
                              <dt className="font-semibold text-[#0F1923]/80">Last activity</dt>
                              <dd className="mt-0.5 break-words">{formatDisplay(c.date_of_last_activity)}</dd>
                            </div>
                          ) : null}
                          {hasFalloffDate ? (
                            <div className="min-w-0">
                              <dt className="font-semibold text-[#0F1923]/80">Est. fall-off date</dt>
                              <dd className="mt-0.5 break-words">{formatDisplay(c.estimated_falloff_date)}</dd>
                            </div>
                          ) : null}
                          {hasMonthsToFalloff ? (
                            <div className="min-w-0">
                              <dt className="font-semibold text-[#0F1923]/80">Months to fall-off</dt>
                              <dd className="mt-0.5 tabular-nums">{formatDisplay(c.months_to_falloff)}</dd>
                            </div>
                          ) : null}
                          {hasStatus ? (
                            <div className="min-w-0">
                              <dt className="font-semibold text-[#0F1923]/80">Status</dt>
                              <dd className="mt-0.5 break-words">{formatDisplay(c.status)}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {tab === "errors" && (
          <ul className="space-y-4">
            {errors.length === 0 ? (
              <li className="rounded-2xl border border-black/5 bg-white px-6 py-10 text-center text-sm opacity-60 shadow-sm">
                No bureau errors flagged in this parse.
              </li>
            ) : (
              errors.map((e, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                  style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
                >
                  <p className="max-w-2xl text-sm leading-relaxed">{formatDisplay(e.description)}</p>
                  <PriorityBadge priority={formatDisplay(e.dispute_priority)} />
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
