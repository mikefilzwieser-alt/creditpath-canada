"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { calculateMonthsClean } from "@/lib/calculate-months-clean";
import { buildFoundationMonthActions, type MonthlyProgramAction } from "@/lib/monthly-program-actions";
import {
  MAX_THEMED_PROGRAM_MONTH,
  normalizeProgramMonth,
} from "@/lib/monthly-progression-themes";
import { logPostgrestError } from "@/lib/log-postgrest-error";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const TOTAL_MONTHS = 24;
const MONTH_THEMES: Record<number, string> = {
  1: "Foundation",
  2: "Stability",
  3: "Momentum",
};
const PLAIN_SCORE_FACTORS = [
  { label: "Late-payment history", pill: "Focus area" },
  { label: "Accounts currently 90+ days late", pill: "Fair" },
  { label: "Accounts with a past-due balance", pill: "Fair" },
  { label: "Recent credit applications", pill: "Fair" },
] as const;

function timelineThemeName(month: number, isBlurred: boolean): string {
  const named = MONTH_THEMES[month];
  if (named) return named;
  return isBlurred ? "Locked Preview" : "Unlocked";
}

function timelineMonthDescription(month: number): string {
  switch (month) {
    case 1:
      return "Build a solid foundation: confirm your bureau snapshot, tighten payment consistency, and align everyday habits with your Blueprint priorities.";
    case 2:
      return "Stabilize momentum: keep utilization in check, follow through on quick-win actions, and reinforce a clean payment history across reporting accounts.";
    case 3:
      return "Push forward with confidence: stack responsible wins, refine your tradeline mix, and stay ready for the next visibility window in your rebuild.";
    default:
      return "Continue your structured rebuild: execute this phase's actions, watch for bureau updates, and keep your plan aligned as you move toward your goals.";
  }
}

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
  credit_cards_reporting?: number;
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

function monthsToFalloffValue(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = numericValue(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
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

function scoreToPercent(score: number): number {
  return Math.min(100, Math.max(0, ((score - 300) / 600) * 100));
}

function scoreRangeLabel(low: number | null, high: number | null): string {
  if (low === null || high === null) return "—";
  return `${low}–${high}`;
}

function ScorePathRow({
  label,
  value,
  low,
  high,
  tone,
}: {
  label: string;
  value: string;
  low: number | null;
  high: number | null;
  tone: "grey" | "teal" | "softTeal";
}) {
  const barColor = tone === "grey" ? "rgba(15, 25, 35, 0.3)" : tone === "teal" ? TEAL : "rgba(0, 201, 167, 0.35)";
  const endScore = high ?? low ?? 300;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-[#0F1923]/70">{label}</span>
        <span className="tabular-nums" style={{ color: tone === "grey" ? "rgba(15,25,35,0.7)" : TEAL }}>
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E7ECEF]">
        <div className="h-full rounded-full" style={{ width: `${scoreToPercent(endScore)}%`, backgroundColor: barColor }} />
      </div>
    </div>
  );
}

function tradelineStatus(row: NonNullable<ParsedBureau["tradelines"]>[number]): {
  label: "Clean" | "High utilization" | "Helping";
  bg: string;
  color: string;
} {
  const util = numericValue(row.utilization);
  const late30 = numericValue(row.late_30);
  const late60 = numericValue(row.late_60);
  const late90 = numericValue(row.late_90);
  const statusText = String(row.payment_status ?? "").toLowerCase();
  if (util >= 50) {
    return { label: "High utilization", bg: "#FEF3C7", color: "#92400E" };
  }
  if (late30 > 0 || late60 > 0 || late90 > 0 || /late|past due|delinquent/.test(statusText)) {
    return { label: "Clean", bg: "rgba(15,25,35,0.08)", color: "rgba(15,25,35,0.7)" };
  }
  return { label: "Helping", bg: "rgba(0,201,167,0.14)", color: NAVY };
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

export default function BlueprintPage() {
  const pathname = usePathname();
  const { user, loading: authLoading, headingFontClass: h } = useDashboardAuth();
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [monthlyPlanRow, setMonthlyPlanRow] = useState<MonthlyPlanRow | null>(null);
  const [error, setError] = useState("");
  const [showScoreSummaryDetail, setShowScoreSummaryDetail] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set());
  const completionsRef = useRef<Set<number>>(new Set());
  const [showMonthCompletionOverlay, setShowMonthCompletionOverlay] = useState(false);
  const [timelineModalMonth, setTimelineModalMonth] = useState<number | null>(null);

  useEffect(() => {
    if (pathname !== "/dashboard/blueprint" || typeof window === "undefined") return;
    const syncActionsHash = () => {
      if (window.location.hash !== "#monthly-actions") return;
      setTab("overview");
      // Retry scroll until element is in DOM
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById("monthly-actions");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempts < 10) {
          attempts++;
          setTimeout(tryScroll, 150);
        }
      };
      queueMicrotask(tryScroll);
    };
    syncActionsHash();
    window.addEventListener("hashchange", syncActionsHash);
    return () => window.removeEventListener("hashchange", syncActionsHash);
  }, [pathname]);

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
    return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(900, Math.max(300, s))) : 0;
  }, [parsed]);

  const equifaxScoreKnown = useMemo(() => {
    const raw = parsed as Record<string, unknown> | null | undefined;
    const s = (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? parsed?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s);
  }, [parsed]);

  const scoreSummaryParts = useMemo(() => {
    const raw = plan?.score_summary;
    const text = typeof raw === "string" ? raw.trim() : formatDisplay(raw);
    if (!text || text === "—") {
      return { visible: text || "—", detail: "", hasDetail: false };
    }
    const cleaned = text.replace(/\u200b/g, "").replace(/\|\s*\|\s*\|/g, "|||");
    const [visibleRaw, ...detailRest] = cleaned.split("|||");
    const visible = visibleRaw.trim();
    const detail = detailRest.join("|||").trim();
    const hasDetail = detail.length > 0;
    const visibleBase = hasDetail ? visible : visible || text;
    return {
      visible: visibleBase ? normalizeSentenceCapitalization(visibleBase) : "",
      detail: detail ? normalizeSentenceCapitalization(detail) : "",
      hasDetail,
    };
  }, [plan?.score_summary]);

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

  useEffect(() => {
    console.log("[celebration] programMonth", programMonth);
    console.log("[celebration] actions array", monthlyProgramActions);
  }, [programMonth, monthlyProgramActions]);

  // TEMP (debug): force overlay when 3/3 complete to verify the dialog renders (remove after confirming).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allCurrentMonthActionsDone) return;
    queueMicrotask(() => setShowMonthCompletionOverlay(true));
  }, [allCurrentMonthActionsDone]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!allCurrentMonthActionsDone) return;
    if (programMonth <= 0 || programMonth >= 5) return;
    const key = `celebration_shown_month_${programMonth}`;
    if (window.localStorage.getItem(key) === "1") return;
    // Do not write localStorage here: React Strict Mode remounts reset overlay state while an early setItem would make
    // the second run skip opening — persist only when the user dismisses the celebration.
    queueMicrotask(() => setShowMonthCompletionOverlay(true));
  }, [allCurrentMonthActionsDone, programMonth]);

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
      const equifaxScoreValue = equifaxScoreKnown ? String(equifaxScore) : "—";
      const coachingStatusLabel = hasPlan ? formatDisplay(plan?.rebuild_score_label) : "Blueprint generated from your Equifax snapshot.";
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
        PLAIN_SCORE_FACTORS.map(
          (f) =>
            `<li class="factor-row"><span>${escapeHtml(f.label)}</span><span class="factor-grade">${escapeHtml(
              f.pill,
            )}</span></li>`,
        ).join("");

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
          <strong>${escapeHtml(equifaxScoreValue)}</strong>
          <span>Equifax score</span>
        </div>
      </div>
      <div class="card" style="margin-top:10px;">
        <span class="card-label">Current coaching status</span>${escapeHtml(coachingStatusLabel)}
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
    hasPlan,
    parsed,
    plan,
    equifaxScoreKnown,
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
  const revolvingNetworkCount =
    typeof plan?.credit_cards_reporting === "number" && Number.isFinite(plan.credit_cards_reporting)
      ? Math.max(0, Math.floor(plan.credit_cards_reporting))
      : countNetworkCardsTowardMinimum(tradelines);
  const recommendedProducts = [...CREDIT_PRODUCT_OFFERS];
  const hasAnyLate = tradelines.some((t) => {
    const codeRaw = String(t.equifax_rating_code ?? t.rating_code ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    const digit = /^([RIO])(\d)/.exec(codeRaw)?.[2];
    const lateViaRating = digit ? Number(digit) >= 2 : false;
    const lateCount = (v: unknown) => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    const lateViaColumns = lateCount(t.late_30) > 0 || lateCount(t.late_60) > 0 || lateCount(t.late_90) > 0;
    return lateViaRating || lateViaColumns;
  });
  const hasCollectionsOnFile = collections.length > 0;
  const createdAt = blueprint?.created_at ? new Date(blueprint.created_at) : null;
  const monthsElapsed =
    createdAt && Number.isFinite(createdAt.getTime())
      ? Math.max(
          0,
          (new Date().getFullYear() - createdAt.getFullYear()) * 12 + (new Date().getMonth() - createdAt.getMonth()),
        )
      : 0;
  const monthsClean = calculateMonthsClean(createdAt);
  const topActionsTotal = monthlyProgramActions.length || 3;
  const readinessPercentage =
    typeof plan?.readiness_percentage === "number" && Number.isFinite(plan.readiness_percentage)
      ? Math.round(plan.readiness_percentage)
      : null;
  const isReadyToApply = readinessPercentage !== null && readinessPercentage >= 75;
  const estimatedGain = !hasAnyLate && !hasCollectionsOnFile ? Math.min(80, monthsElapsed * 8) : 0;
  const estimatedScore =
    equifaxScoreKnown ? Math.min(900, Math.max(300, Math.round(equifaxScore + estimatedGain))) : null;
  const estimatedRangeStart = estimatedScore;
  const estimatedRangeEnd =
    estimatedScore !== null ? Math.min(900, Math.max(300, Math.round(estimatedScore + 15))) : null;
  const month3RangeStart = estimatedRangeEnd !== null ? Math.min(900, estimatedRangeEnd + 10) : null;
  const month3RangeEnd = estimatedRangeEnd !== null ? Math.min(900, estimatedRangeEnd + 25) : null;
  const month4RangeStart = estimatedRangeEnd !== null ? Math.min(900, estimatedRangeEnd + 20) : null;
  const month4RangeEnd = estimatedRangeEnd !== null ? Math.min(900, estimatedRangeEnd + 45) : null;
  const month5RangeStart = estimatedRangeEnd !== null ? Math.min(900, estimatedRangeEnd + 30) : null;
  const month5RangeEnd = estimatedRangeEnd !== null ? Math.min(900, estimatedRangeEnd + 65) : null;

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

      <section
        className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
        style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className={`text-lg font-bold ${h}`}>Monthly Progress Timeline</h2>
          <p className="text-xs text-[#0F1923]/60">Current month highlighted in teal</p>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2.5 pr-2">
            {Array.from({ length: TOTAL_MONTHS }, (_, idx) => idx + 1).map((month) => {
              const isCurrent = month === programMonth;
              const unlockedCutoff = Math.min(TOTAL_MONTHS, programMonth + 2);
              const blurredCutoff = Math.min(TOTAL_MONTHS, programMonth + 5);
              const isUnlocked = month <= unlockedCutoff;
              const isBlurred = !isUnlocked && month <= blurredCutoff;
              const themeLabel = MONTH_THEMES[month];

              if (!isUnlocked && !isBlurred) {
                return (
                  <div
                    key={month}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0F1923]/15 bg-[#0F1923]/8"
                    title={`Month ${month} locked`}
                    aria-label={`Month ${month} locked`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0F1923]/35" />
                  </div>
                );
              }

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    if (!isUnlocked) return;
                    setTimelineModalMonth(month);
                  }}
                  className={`relative flex shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition-all ${
                    isCurrent ? "shadow-sm" : ""
                  }`}
                  style={{
                    minWidth: 110,
                    borderColor: isCurrent ? TEAL : "rgba(15, 25, 35, 0.12)",
                    backgroundColor: isCurrent ? "rgba(0, 201, 167, 0.14)" : "#fff",
                    color: NAVY,
                    filter: isBlurred ? "blur(0.8px)" : "none",
                    opacity: isBlurred ? 0.75 : 1,
                    cursor: isUnlocked ? "pointer" : "not-allowed",
                  }}
                  aria-label={`Month ${month}${isCurrent ? ", current month" : ""}${isBlurred ? ", locked preview" : ""}`}
                  disabled={!isUnlocked}
                >
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${h}`}>
                    Mo {month}
                  </span>
                  <span className="mt-0.5 text-sm font-semibold leading-tight">
                    {themeLabel ?? (isBlurred ? "Locked Preview" : "Unlocked")}
                  </span>
                  {isBlurred && (
                    <span className="absolute right-2 top-2 text-xs" aria-hidden="true">
                      🔒
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

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
          style={{ borderColor: TEAL, backgroundColor: "rgba(0, 201, 167, 0.08)", color: NAVY }}
          role="status"
        >
          <p className={`text-base font-bold ${h}`} style={{ color: TEAL }}>
            🎯 Consumer Proposal — Your Program Starts Now
          </p>
          <p className="mt-2 font-medium leading-relaxed" style={{ color: NAVY, opacity: 0.85 }}>
            {formatDisplay(parsed.dnq_reason)}
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: NAVY, opacity: 0.65 }}>
            Credit Path Canada was built for exactly this situation. Clients who start now are positioned to be fully approval-ready the moment their proposal discharges.
          </p>
        </div>
      ) : null}

      <div
        className="flex w-full flex-wrap gap-1 rounded-2xl border border-black/5 bg-[#F5F7FA] p-1.5 shadow-sm sm:w-fit"
        style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
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
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${h}`}
              style={{
                color: active ? NAVY : "rgba(15, 25, 35, 0.55)",
                border: active ? `1px solid ${TEAL}` : "1px solid transparent",
                backgroundColor: active ? "#FFFFFF" : "transparent",
                boxShadow: active ? "0 6px 18px rgba(15, 25, 35, 0.08)" : "none",
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
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" style={{ border: `1.5px solid ${TEAL}` }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0F1923]/50 ${h}`}>
                    Current Score
                  </p>
                  <p className={`mt-1 text-[44px] font-extrabold leading-none tabular-nums ${h}`}>
                    {equifaxScoreKnown ? equifaxScore : "—"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className={`text-xs font-bold text-[#0F1923]/55 ${h}`}>Where this month could take you</p>
                  <p className={`mt-1 text-2xl font-extrabold leading-none tabular-nums ${h}`} style={{ color: TEAL }}>
                    {scoreRangeLabel(estimatedRangeStart, estimatedRangeEnd)}
                  </p>
                </div>
              </div>
              <div className="my-4 h-px bg-[#0F1923]/10" />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1923]/35">
                  <span>300</span>
                  <span>900</span>
                </div>
                <ScorePathRow
                  label="Month 1"
                  value={equifaxScoreKnown ? String(equifaxScore) : "—"}
                  low={equifaxScoreKnown ? equifaxScore : null}
                  high={equifaxScoreKnown ? equifaxScore : null}
                  tone="grey"
                />
                <ScorePathRow
                  label="Month 2"
                  value={scoreRangeLabel(estimatedRangeStart, estimatedRangeEnd)}
                  low={estimatedRangeStart}
                  high={estimatedRangeEnd}
                  tone="teal"
                />
                <ScorePathRow
                  label="Month 3"
                  value={scoreRangeLabel(month3RangeStart, month3RangeEnd)}
                  low={month3RangeStart}
                  high={month3RangeEnd}
                  tone="softTeal"
                />
                <ScorePathRow
                  label="Month 4"
                  value={scoreRangeLabel(month4RangeStart, month4RangeEnd)}
                  low={month4RangeStart}
                  high={month4RangeEnd}
                  tone="softTeal"
                />
                <ScorePathRow
                  label="Month 5"
                  value={scoreRangeLabel(month5RangeStart, month5RangeEnd)}
                  low={month5RangeStart}
                  high={month5RangeEnd}
                  tone="softTeal"
                />
              </div>
            </section>

            <section
              className="rounded-xl border-l-4 p-4 shadow-sm"
              style={{ backgroundColor: NAVY, borderLeftColor: TEAL, color: "#E9F5F3" }}
              role="alert"
            >
              <p className={`text-sm font-semibold leading-relaxed ${h}`} style={{ color: "#B45309" }}>
                Before applying anywhere, contact us first. If you receive a text or call saying you are approved — do not respond.
              </p>
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

            <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${h}`} style={{ color: TEAL }}>
                Where you&apos;re at
              </p>
              <h2 className={`mt-2 text-lg font-bold ${h}`}>What&apos;s holding your score back</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#0F1923]/75">
                {scoreSummaryParts.visible && scoreSummaryParts.visible !== "—"
                  ? scoreSummaryParts.visible
                  : "Your bureau snapshot shows the areas to focus on first. Follow your monthly actions and avoid new applications while your file stabilizes."}
              </p>
              {scoreSummaryParts.hasDetail ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowScoreSummaryDetail((v) => !v)}
                    className={`mt-3 inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold ${h}`}
                    style={{ color: TEAL }}
                    aria-expanded={showScoreSummaryDetail}
                    aria-label={showScoreSummaryDetail ? "Hide full score summary" : "Show full score summary"}
                  >
                    <span
                      aria-hidden
                      className="inline-flex size-6 items-center justify-center rounded border text-base font-bold leading-none transition-colors"
                      style={{
                        borderColor: TEAL,
                        backgroundColor: showScoreSummaryDetail ? "rgba(0, 201, 167, 0.2)" : "transparent",
                      }}
                    >
                      {showScoreSummaryDetail ? "−" : "+"}
                    </span>
                  </button>
                  {showScoreSummaryDetail ? (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: TEAL }}>
                      {scoreSummaryParts.detail}
                    </p>
                  ) : null}
                </>
              ) : null}
            </section>

            <section
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
            >
              <h2 className={`text-lg font-bold ${h}`}>Your Rebuild Progress</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-black/5 bg-white p-4" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
                  <p className="text-sm text-[#0F1923]/75">Actions Completed</p>
                  <p className={`mt-2 text-xl font-bold ${h}`} style={{ color: TEAL }}>
                    {completedSet.size} of {topActionsTotal} completed
                  </p>
                </div>
                <div className="rounded-xl border border-black/5 bg-white p-4" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
                  <p className="text-sm text-[#0F1923]/75">Months Clean</p>
                  <p className={`mt-2 text-xl font-bold ${h}`} style={{ color: TEAL }}>
                    {monthsClean}
                  </p>
                </div>
                <div className="rounded-xl border border-black/5 bg-white p-4" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
                  <p className="text-sm text-[#0F1923]/75">Credit Cards Reporting</p>
                  <p className={`mt-2 text-xl font-bold ${h}`} style={{ color: TEAL }}>
                    {revolvingNetworkCount} of 3 recommended
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4" style={{ border: `1px solid ${TEAL}` }}>
                  <p className="text-sm text-[#0F1923]/75">Approval status</p>
                  <p className={`mt-2 text-xl font-bold ${h}`} style={{ color: TEAL }}>
                    {isReadyToApply ? "✓ Ready to Apply" : "Building toward ready"}
                  </p>
                  <p className="mt-1 text-xs text-[#0F1923]/65">
                    {isReadyToApply
                      ? "Talk to Michael before you apply anywhere."
                      : "Keep completing your actions — we'll let you know when you're ready."}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium" style={{ color: TEAL }}>
                Complete your monthly actions to move these numbers forward.
              </p>
            </section>

            <section
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
            >
              <h2 className={`text-lg font-bold ${h}`}>Score factors</h2>
              <ul className="mt-4 space-y-3">
                {PLAIN_SCORE_FACTORS.map((factor) => (
                  <li
                    key={factor.label}
                    className="flex items-start justify-between gap-3 rounded-xl border border-black/5 px-3 py-2.5"
                    style={{ borderColor: "rgba(15, 25, 35, 0.06)" }}
                  >
                    <span className="text-sm leading-snug">{factor.label}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${h}`}
                      style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                    >
                      {factor.pill}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold text-[#0F1923]/55">
                {formatDisplay(s.total_accounts)} total accounts · {formatDisplay(s.open_accounts)} open
              </p>
            </section>

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
          </div>
        )}

        {tab === "tradelines" && (
          <div>
            <div className="space-y-3 md:hidden">
              {tradelines.length === 0 ? (
                <div className="rounded-2xl border border-black/5 bg-white px-6 py-8 text-center text-sm opacity-60 shadow-sm">
                  No tradelines in this report.
                </div>
              ) : (
                tradelines.map((row, i) => {
                  const status = tradelineStatus(row);
                  return (
                    <article
                      key={i}
                      className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                      style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className={`min-w-0 text-sm font-bold leading-snug ${h}`}>{formatDisplay(row.creditor_name)}</h3>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${h}`}
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-4 gap-2 text-xs">
                        <div className="min-w-0">
                          <dt className="font-semibold text-[#0F1923]/45">Network</dt>
                          <dd className="mt-1 truncate capitalize text-[#0F1923]/80">{formatDisplay(row.network)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="font-semibold text-[#0F1923]/45">Balance</dt>
                          <dd className="mt-1 truncate tabular-nums text-[#0F1923]/80">{formatDisplay(row.balance)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="font-semibold text-[#0F1923]/45">Util.</dt>
                          <dd className="mt-1 truncate tabular-nums text-[#0F1923]/80">{formatPercent(row.utilization)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="font-semibold text-[#0F1923]/45">30-60-90</dt>
                          <dd className="mt-1 truncate tabular-nums text-[#0F1923]/80">
                            {formatDisplay(row.late_30)}/{formatDisplay(row.late_60)}/{formatDisplay(row.late_90)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 border-t border-black/10 pt-3">
                        <p className="text-sm leading-relaxed text-[#0F1923]/80">{formatDisplay(row.action_recommended)}</p>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm md:block" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
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
      {timelineModalMonth !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeline-modal-title"
          onClick={() => setTimelineModalMonth(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 bg-white p-6 shadow-xl"
            style={{ borderColor: TEAL, color: NAVY }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F1923]/50">Month</p>
            <h2 id="timeline-modal-title" className={`mt-1 text-2xl font-bold ${h}`}>
              Month {timelineModalMonth}
            </h2>
            <p className={`mt-2 text-sm font-semibold ${h}`} style={{ color: TEAL }}>
              {timelineThemeName(timelineModalMonth, false)}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#0F1923]/85">
              {timelineMonthDescription(timelineModalMonth)}
            </p>
            <button
              type="button"
              onClick={() => setTimelineModalMonth(null)}
              className={`mt-6 w-full rounded-xl py-3 text-sm font-bold text-[#0F1923] ${h}`}
              style={{ backgroundColor: TEAL }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      {showMonthCompletionOverlay ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-6 py-10"
          style={{ backgroundColor: "rgba(15, 25, 35, 0.94)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Month completion celebration"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className="cp-confetti"
                style={
                  {
                    left: `${(i * 3.7) % 100}%`,
                    animationDelay: `${(i % 12) * 0.18}s`,
                    animationDuration: `${4.8 + (i % 6) * 0.35}s`,
                    backgroundColor: i % 2 === 0 ? "#00C9A7" : "#FFFFFF",
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="relative z-10 mx-auto w-full max-w-xl text-center">
            <p className={`text-6xl ${h}`} style={{ lineHeight: 1.1, color: TEAL }}>
              🏆
            </p>
            <p className={`mt-5 text-3xl font-bold ${h}`} style={{ color: "#FFFFFF" }}>
              🏆 You crushed Month {programMonth}.
            </p>
            <p className={`mx-auto mt-4 max-w-lg text-base leading-relaxed ${h}`} style={{ color: "rgba(255,255,255,0.86)" }}>
              Every action complete. Your progress is locked in. Keep this momentum going.
            </p>
            <button
              type="button"
              className={`mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold ${h}`}
              style={{ backgroundColor: TEAL, color: NAVY }}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(`celebration_shown_month_${programMonth}`, "1");
                }
                setShowMonthCompletionOverlay(false);
              }}
            >
              Keep going →
            </button>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .cp-confetti {
          position: absolute;
          top: -12%;
          width: 8px;
          height: 14px;
          border-radius: 999px;
          opacity: 0.95;
          animation-name: cp-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes cp-fall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
          }
          100% {
            transform: translate3d(0, 112vh, 0) rotate(420deg);
          }
        }
      `}</style>
    </div>
  );
}
