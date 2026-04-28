"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { getMonthlyProgramActionCount } from "@/lib/goals-milestone-helpers";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const TOTAL_MONTHS = 24;
const MONTH_THEMES: Record<number, string> = {
  1: "Foundation",
  2: "Stability",
  3: "Momentum",
};

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
      return "Continue your structured rebuild: execute this phase’s actions, watch for bureau updates, and keep your plan aligned as you move toward your goals.";
  }
}

function firstNameFromUser(
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null,
) {
  if (!user) return "there";
  const meta = user.user_metadata ?? {};
  const full = meta.full_name;
  if (typeof full === "string" && full.trim()) {
    return full.trim().split(/\s+/)[0]!;
  }
  const first = meta.first_name;
  if (typeof first === "string" && first.trim()) {
    return first.trim();
  }
  const email = user.email;
  if (email && email.includes("@")) {
    return email.split("@")[0]!;
  }
  return "there";
}

type ParsedBureau = {
  consumer_proposal?: boolean;
  tradelines?: Array<{
    creditor_name?: string;
    network?: string;
    account_type?: string;
    equifax_rating_code?: string;
    rating_code?: string;
    late_30?: number | string;
    late_60?: number | string;
    late_90?: number | string;
  }>;
  collections?: Array<{
    creditor?: string;
    status?: string;
    amount?: number | string;
  }>;
  score?: { equifax_score?: number };
  summary?: {
    utilization_percentage?: number | string;
    on_time_payment_percentage?: number | string;
    derogatory_marks?: number | string;
    hard_inquiries_12mo?: number | string;
  };
};

type BlueprintPlan = {
  rebuild_score?: number;
  rebuild_score_label?: string;
  score_summary?: string;
  this_months_focus?: string;
  readiness_percentage?: number;
  credit_cards_reporting?: number;
  top_actions?: Array<{
    action?: string;
    impact?: string;
    timeline?: string;
  }>;
};

type BlueprintRow = {
  id?: string;
  created_at?: string;
  raw_parse_data: ParsedBureau | null;
  blueprint_data: BlueprintPlan | null;
  current_month?: number | null;
};

function parseNumberLike(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function isNetworkCard(tradeline: NonNullable<ParsedBureau["tradelines"]>[number]): boolean {
  const codeRaw = String(tradeline?.equifax_rating_code ?? tradeline?.rating_code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "");
  if (!/^R\d/.test(codeRaw)) return false;

  const network = String(tradeline?.network ?? "").toLowerCase().trim();
  if (network === "visa" || network === "mastercard" || network === "amex") return true;
  if (network === "store_only" || network === "n/a") return false;

  const merged = `${tradeline?.account_type ?? ""} ${tradeline?.creditor_name ?? ""}`.toLowerCase();
  return /\bvisa\b|mastercard|master card|\bamex\b|american express/.test(merged);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, headingFontClass, hasDashboardAccess } = useDashboardAuth();
  const firstName = firstNameFromUser(user);
  const h = headingFontClass;
  const [checkoutActivating, setCheckoutActivating] = useState(false);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(true);
  const [timelineModalMonth, setTimelineModalMonth] = useState<number | null>(null);
  const [completedActionsCount, setCompletedActionsCount] = useState(0);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [brandonDismissed, setBrandonDismissed] = useState(false);
  const [eqDismissed, setEqDismissed] = useState(false);

  const loadBlueprint = useCallback(async () => {
    if (!user) return;
    setBlueprintLoading(true);
    const { data: clientData } = await supabase.from("clients").select("created_at").eq("id", user.id).maybeSingle();
    setEnrolledAt(typeof clientData?.created_at === "string" ? clientData.created_at : null);
    const { data, error } = await supabase
      .from("blueprints")
      .select(
        "id, client_id, month_number, status, raw_parse_data, blueprint_data, created_at, updated_at, current_month",
      )
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setBlueprint(null);
      setCompletedActionsCount(0);
    } else {
      const latest = data as BlueprintRow | null;
      setBlueprint(latest);
      if (latest?.id && user?.id) {
        const progMonth =
          typeof (latest as { current_month?: number }).current_month === "number" &&
          Number.isFinite((latest as { current_month?: number }).current_month)
            ? Math.max(1, Math.floor((latest as { current_month: number }).current_month))
            : 1;
        const { count, error: compErr } = await supabase
          .from("action_completions")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id)
          .eq("blueprint_id", latest.id)
          .eq("program_month", progMonth)
          .in("action_index", [0, 1, 2]);
        if (compErr) {
          console.error("[dashboard] action_completions count failed", compErr);
        }
        setCompletedActionsCount(compErr ? 0 : Math.min(3, count ?? 0));
      } else {
        setCompletedActionsCount(0);
      }
    }
    setBlueprintLoading(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadBlueprint();
    });
    return () => {
      cancelled = true;
    };
  }, [loadBlueprint]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBrandonDismissed(window.localStorage.getItem("brandon_card_dismissed") === "true");
    setEqDismissed(window.localStorage.getItem("eq_card_dismissed") === "true");
  }, []);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;

    let cancelled = false;

    void (async () => {
      setCheckoutActivating(true);
      try {
        await fetch("/api/clients/activate-after-checkout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        // Still clear the query param so the user is not stuck in a retry loop on refresh.
      } finally {
        if (cancelled) return;
        router.replace("/dashboard");
        setCheckoutActivating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const parsed = blueprint?.raw_parse_data as ParsedBureau | null | undefined;
  const plan = blueprint?.blueprint_data as BlueprintPlan | null | undefined;
  const consumerProposal = parsed?.consumer_proposal === true;

  const topActionsTotal = useMemo(
    () => getMonthlyProgramActionCount((blueprint as { current_month?: number } | null)?.current_month),
    [blueprint],
  );

  const tradelines = Array.isArray(parsed?.tradelines) ? parsed.tradelines : [];
  const collections = Array.isArray(parsed?.collections) ? parsed.collections : [];
  const equifaxScore = (() => {
    const raw = parsed as { equifax_score?: number; score?: { equifax_score?: number } } | null | undefined;
    const s = (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? raw?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(900, Math.max(300, s))) : null;
  })();

  const rawCurrentMonth = user?.user_metadata?.current_month;
  const currentMonth =
    typeof rawCurrentMonth === "number" && Number.isFinite(rawCurrentMonth)
      ? Math.max(1, Math.min(TOTAL_MONTHS, Math.round(rawCurrentMonth)))
      : 1;

  const hasBlueprint = Boolean(blueprint) && !blueprintLoading;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading"
        />
        <p className={`text-sm opacity-70 ${headingFontClass}`}>Loading…</p>
      </div>
    );
  }

  if (checkoutActivating) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center"
        style={{ color: NAVY }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Setting up account"
        />
        <p className={`text-base font-semibold sm:text-lg ${headingFontClass}`}>Setting up your account...</p>
        <p className={`max-w-sm text-sm opacity-70 ${headingFontClass}`}>
          Finishing your subscription so you can use the dashboard.
        </p>
      </div>
    );
  }

  const createdAt = blueprint?.created_at ? new Date(blueprint.created_at) : null;

  const monthsElapsed =
    createdAt && Number.isFinite(createdAt.getTime())
      ? Math.max(
          0,
          (new Date().getFullYear() - createdAt.getFullYear()) * 12 + (new Date().getMonth() - createdAt.getMonth()),
        )
      : 0;
  const hasAnyLate = tradelines.some((t) => {
    const codeRaw = String(t?.equifax_rating_code ?? t?.rating_code ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    const digit = /^([RIO])(\d)/.exec(codeRaw)?.[2];
    const lateViaRating = digit ? Number(digit) >= 2 : false;
    const lateViaColumns = parseNumberLike(t?.late_30) > 0 || parseNumberLike(t?.late_60) > 0 || parseNumberLike(t?.late_90) > 0;
    return lateViaRating || lateViaColumns;
  });
  const hasCollections = collections.length > 0;
  const monthsClean = hasAnyLate || hasCollections ? 0 : monthsElapsed;

  const cardsReporting =
    typeof plan?.credit_cards_reporting === "number" && Number.isFinite(plan.credit_cards_reporting)
      ? Math.max(0, Math.floor(plan.credit_cards_reporting))
      : tradelines.filter(isNetworkCard).length;
  const readinessPercentage =
    typeof plan?.readiness_percentage === "number" && Number.isFinite(plan.readiness_percentage)
      ? Math.min(100, Math.max(0, Math.round(plan.readiness_percentage)))
      : 0;
  const estimatedGain = !hasAnyLate && !hasCollections ? Math.min(80, monthsElapsed * 8) : 0;
  const estimatedScore =
    equifaxScore !== null
      ? Math.min(900, Math.max(300, Math.round(equifaxScore + estimatedGain)))
      : null;
  const estimatedRangeStart = estimatedScore;
  const estimatedRangeEnd =
    estimatedScore !== null ? Math.min(900, Math.max(300, Math.round(estimatedScore + 15))) : null;

  const allMonthlyActionsComplete =
    hasBlueprint && topActionsTotal > 0 && completedActionsCount === topActionsTotal;
  const enrollmentDays = useMemo(() => {
    if (!enrolledAt) return 0;
    const created = new Date(enrolledAt).getTime();
    if (!Number.isFinite(created)) return 0;
    return Math.max(0, Math.floor((Date.now() - created) / (24 * 60 * 60 * 1000)));
  }, [enrolledAt]);
  const showBrandonCard = enrollmentDays >= 3 && !brandonDismissed;
  const showEqCard = enrollmentDays >= 7 && !eqDismissed && !consumerProposal;
  const rebuildScoreNumber =
    typeof plan?.rebuild_score === "number" && Number.isFinite(plan.rebuild_score) ? Math.round(plan.rebuild_score) : null;
  const monthOneActions = (Array.isArray(plan?.top_actions) ? plan.top_actions : [])
    .map((a) => (typeof a?.action === "string" ? a.action.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);

  if (!hasDashboardAccess && hasBlueprint) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" style={{ color: NAVY }}>
        <header className="space-y-2">
          <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>Welcome back, {firstName}</h1>
          <p className="text-sm text-[#0F1923]/70">Your blueprint preview is ready.</p>
        </header>
        {showBrandonCard ? (
          <section
            className="rounded-2xl border border-black/5 border-l-4 bg-white p-5 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)", borderLeftColor: TEAL }}
          >
            <p className={`text-base font-bold leading-snug ${h}`}>📅 Not sure what this all means for your financial picture?</p>
            <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
              Book a free session with Brandon Kirk — licensed financial specialist and Credit Path Canada partner. No cost, no obligation.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a
                href="https://calendly.com/brandonkirk/"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold ${h}`}
                style={{ backgroundColor: TEAL, color: NAVY }}
              >
                Book Free Session →
              </a>
              <button
                type="button"
                className="text-xs font-semibold text-[#0F1923]/45 underline underline-offset-2"
                onClick={() => {
                  setBrandonDismissed(true);
                  if (typeof window !== "undefined") window.localStorage.setItem("brandon_card_dismissed", "true");
                }}
              >
                No thanks
              </button>
            </div>
          </section>
        ) : null}
        {showEqCard ? (
          <section
            className="rounded-2xl border border-black/5 border-l-4 bg-white p-5 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)", borderLeftColor: TEAL }}
          >
            <p className={`text-base font-bold leading-snug ${h}`}>
              💳 Did you know? One of the fastest ways to build your credit history is adding a card that reports to both bureaus.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
              EQ Bank&apos;s card has no credit check required and reports to both Equifax and TransUnion. It takes 5 minutes to apply.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a
                href="https://join.eqbank.ca/?code=MICHAEL1577"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold ${h}`}
                style={{ backgroundColor: TEAL, color: NAVY }}
              >
                Get EQ Bank Card →
              </a>
              <button
                type="button"
                className="text-xs font-semibold text-[#0F1923]/45 underline underline-offset-2"
                onClick={() => {
                  setEqDismissed(true);
                  if (typeof window !== "undefined") window.localStorage.setItem("eq_card_dismissed", "true");
                }}
              >
                No thanks
              </button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F1923]/60">Equifax Score</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${h}`} style={{ color: NAVY }}>
              {equifaxScore ?? "—"}
            </p>
          </div>
          <div
            className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F1923]/60">Rebuild Score</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${h}`} style={{ color: NAVY }}>
              {rebuildScoreNumber ?? "—"}
            </p>
          </div>
        </section>

        <section
          className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
        >
          <h2 className={`text-lg font-bold ${h}`}>Your 3 Month 1 actions are ready</h2>
          <ul className="mt-4 space-y-3">
            {(monthOneActions.length > 0 ? monthOneActions : ["Action 1", "Action 2", "Action 3"]).map((action, idx) => (
              <li
                key={`${idx}-${action}`}
                className="rounded-xl border border-black/10 bg-[#F8FAFC] px-4 py-3 text-sm font-semibold leading-relaxed text-[#0F1923]"
                style={{ filter: "blur(4px)", userSelect: "none" }}
                aria-hidden
              >
                {action}
              </li>
            ))}
          </ul>
          <div className="absolute inset-x-4 bottom-4 rounded-2xl border-2 p-5 shadow-lg" style={{ borderColor: TEAL, backgroundColor: "rgba(0, 201, 167, 0.95)", color: NAVY }}>
            <p className={`text-lg font-bold leading-snug ${h}`}>Your blueprint is built. Activate your free trial to unlock it.</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              First 30 days free. Cancel anytime. Less than a coffee a week.
            </p>
            <Link
              href="/onboarding"
              className={`mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#0F1923] px-5 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 ${h}`}
            >
              Unlock My Blueprint — Free for 30 Days
            </Link>
          </div>
          <div className="h-40" aria-hidden />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8" style={{ color: NAVY }}>
      <section
        className="rounded-xl border-l-4 p-4 shadow-sm"
        style={{ backgroundColor: NAVY, borderLeftColor: TEAL, color: "#E9F5F3" }}
        role="alert"
      >
        <p className={`text-sm font-semibold leading-relaxed ${h}`}>
          Important: <span style={{ color: "#00C9A7" }}>Do not apply for credit anywhere without contacting us first.</span> Every application
          is a hard inquiry that damages your score and could delay your approval. We are your credit
          specialist — reach out before you act.
        </p>
      </section>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>
          Welcome back, {firstName}
        </h1>
        <span
          className="inline-flex w-fit items-center rounded-full border px-4 py-1.5 text-sm font-semibold"
          style={{
            borderColor: TEAL,
            color: TEAL,
            backgroundColor: "rgba(0, 201, 167, 0.12)",
          }}
        >
          Month {currentMonth} of {TOTAL_MONTHS}
        </span>
      </header>

      {showBrandonCard ? (
        <section
          className="rounded-2xl border border-black/5 border-l-4 bg-white p-5 shadow-sm"
          style={{ borderColor: "rgba(15, 25, 35, 0.08)", borderLeftColor: TEAL }}
        >
          <p className={`text-base font-bold leading-snug ${h}`}>📅 Not sure what this all means for your financial picture?</p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
            Book a free session with Brandon Kirk — licensed financial specialist and Credit Path Canada partner. No cost, no obligation.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href="https://calendly.com/brandonkirk/"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold ${h}`}
              style={{ backgroundColor: TEAL, color: NAVY }}
            >
              Book Free Session →
            </a>
            <button
              type="button"
              className="text-xs font-semibold text-[#0F1923]/45 underline underline-offset-2"
              onClick={() => {
                setBrandonDismissed(true);
                if (typeof window !== "undefined") window.localStorage.setItem("brandon_card_dismissed", "true");
              }}
            >
              No thanks
            </button>
          </div>
        </section>
      ) : null}

      {showEqCard ? (
        <section
          className="rounded-2xl border border-black/5 border-l-4 bg-white p-5 shadow-sm"
          style={{ borderColor: "rgba(15, 25, 35, 0.08)", borderLeftColor: TEAL }}
        >
          <p className={`text-base font-bold leading-snug ${h}`}>
            💳 Did you know? One of the fastest ways to build your credit history is adding a card that reports to both bureaus.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
            EQ Bank&apos;s card has no credit check required and reports to both Equifax and TransUnion. It takes 5 minutes to apply.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href="https://join.eqbank.ca/?code=MICHAEL1577"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold ${h}`}
              style={{ backgroundColor: TEAL, color: NAVY }}
            >
              Get EQ Bank Card →
            </a>
            <button
              type="button"
              className="text-xs font-semibold text-[#0F1923]/45 underline underline-offset-2"
              onClick={() => {
                setEqDismissed(true);
                if (typeof window !== "undefined") window.localStorage.setItem("eq_card_dismissed", "true");
              }}
            >
              No thanks
            </button>
          </div>
        </section>
      ) : null}

      <section
        className="rounded-2xl border-2 p-5 shadow-sm sm:p-6"
        style={{ backgroundColor: NAVY, borderColor: TEAL, color: "#E9F5F3" }}
        aria-label="Vehicle upgrade"
      >
        <p className={`text-base font-bold leading-snug sm:text-lg ${h}`}>
          🚗 Your vehicle upgrade window opens at Month 8.
        </p>
        <p className={`mt-2 text-sm leading-relaxed text-white/85 sm:text-base ${h}`}>
          Stay on track with your monthly actions and we&apos;ll get you into something better.
        </p>
        <a
          href="mailto:michaelf@titaniumford.ca"
          className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-bold transition-opacity hover:opacity-92 sm:w-auto ${h}`}
          style={{ backgroundColor: TEAL, color: NAVY }}
        >
          Talk to Michael — Titanium Ford Finance Director
        </a>
      </section>

      {allMonthlyActionsComplete ? (
        <section
          className="rounded-2xl border-2 bg-white p-5 shadow-sm sm:p-6"
          style={{ borderColor: TEAL, boxShadow: "0 8px 28px rgba(0, 201, 167, 0.12)" }}
          aria-live="polite"
        >
          <p className={`flex flex-wrap items-center gap-2 text-lg font-bold sm:text-xl ${h}`} style={{ color: NAVY }}>
            <span className="text-2xl sm:text-3xl" aria-hidden>
              🏆
            </span>
            You crushed it this month!
          </p>
        </section>
      ) : null}

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
              const isCurrent = month === currentMonth;
              const unlockedCutoff = Math.min(TOTAL_MONTHS, currentMonth + 2);
              const blurredCutoff = Math.min(TOTAL_MONTHS, currentMonth + 5);
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

      {hasBlueprint ? (
        <section
          className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
        >
          <h2 className={`text-lg font-bold ${h}`}>Your Rebuild Progress</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-black/5 bg-white p-4" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
              <p className="text-sm text-[#0F1923]/75">Actions Completed</p>
              <p className={`mt-2 text-xl font-bold ${h}`} style={{ color: TEAL }}>
                {completedActionsCount} of {topActionsTotal} completed
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
                {cardsReporting} of 3 recommended
              </p>
            </div>
            <div className="rounded-xl border border-black/5 bg-white p-4" style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}>
              <p className="text-sm text-[#0F1923]/75">Auto Approval Readiness</p>
              <p className={`mt-2 text-xl font-bold ${h}`} style={{ color: TEAL }}>
                {readinessPercentage}%
              </p>
              <p className="mt-1 text-xs text-[#0F1923]/65">Readiness for auto approval</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${readinessPercentage}%`, backgroundColor: TEAL }}
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium" style={{ color: TEAL }}>
            Complete your monthly actions to move these numbers forward.
          </p>
        </section>
      ) : null}

      {hasBlueprint && equifaxScore !== null && estimatedRangeStart !== null && estimatedRangeEnd !== null ? (
        <section
          className={`rounded-2xl p-6 shadow-lg sm:p-8 ${h}`}
          style={{
            backgroundColor: NAVY,
            color: "#fff",
            boxShadow: "0 12px 40px rgba(15, 25, 35, 0.25)",
          }}
        >
          <h2 className="text-lg font-bold tracking-tight text-white">Estimated Current Score</h2>

          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 w-full flex-1 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
                Current Score
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums leading-none tracking-tight text-white">
                {equifaxScore}
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-center py-1 sm:py-0" aria-hidden>
              <svg
                width="40"
                height="24"
                viewBox="0 0 40 24"
                fill="none"
                className="rotate-90 text-white/45 sm:rotate-0"
                aria-hidden
              >
                <path
                  d="M4 12h22M22 6l8 6-8 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0 w-full flex-1 text-center sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
                Estimated Score After 1 Month
              </p>
              <p
                className="mt-2 text-4xl font-bold tabular-nums leading-none tracking-tight"
                style={{ color: TEAL }}
              >
                {estimatedRangeEnd}
              </p>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-white/60">
            Based on your bureau upload. Upload a new report for an accurate reading.
          </p>

          <div className="mt-5 flex justify-center">
            <Link
              href="/dashboard/upload"
              className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-opacity hover:opacity-92 sm:w-auto ${h}`}
              style={{ backgroundColor: TEAL, color: NAVY }}
            >
              Upload New Report
            </Link>
          </div>
        </section>
      ) : null}

      {!hasBlueprint ? (
        <section
          className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-lg font-bold ${h}`}>Activate your Blueprint</h2>
              <p className="mt-1 text-sm text-[#0F1923]/70">
                Upload your Borrowell report to activate your Blueprint.
              </p>
            </div>
            <Link
              href="/dashboard/upload"
              className="inline-flex shrink-0 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-[#0F1923] transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Upload report
            </Link>
          </div>
        </section>
      ) : (
        <section
          className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-lg font-bold ${h}`}>Your Blueprint</h2>
              <p className="mt-1 text-sm text-[#0F1923]/70">
                View full details, tradelines, collections, and download your credit blueprint.
              </p>
            </div>
            <Link
              href="/dashboard/blueprint"
              className="inline-flex shrink-0 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-[#0F1923] transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              View your Blueprint
            </Link>
          </div>
        </section>
      )}

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

    </div>
  );
}
