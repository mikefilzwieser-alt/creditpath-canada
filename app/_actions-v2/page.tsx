"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { calculateMonthsClean } from "@/lib/calculate-months-clean";
import { logPostgrestError } from "@/lib/log-postgrest-error";
import { buildFoundationMonthActions, type MonthlyProgramAction } from "@/lib/monthly-program-actions";
import {
  getProgramMonthThemeTitle,
  MAX_THEMED_PROGRAM_MONTH,
  normalizeProgramMonth,
} from "@/lib/monthly-progression-themes";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const TOTAL_MONTHS = 24;
const UPGRADE_MONTH = 8;
const SCORE_SCALE_MIN = 380;
const SCORE_SCALE_MAX = 750;
const PROJECTED_BAR_MAX_PERCENT = 60;
const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;

const CREDIT_PRODUCT_OFFERS = [
  {
    name: "Neo Financial",
    description: "Canada's top credit-building card. Reports to Equifax. Apply now.",
    href: "https://neo.cc/refer/G3Y6L5A9",
    cta: "Apply now",
  },
  {
    name: "Tangerine Money-Back Credit Card",
    description: "No credit check secured option. Reports to both Equifax and TransUnion.",
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
  month_unlocked_at?: string | null;
};

type MonthlyPlanRow = {
  month_number: number;
  theme: string | null;
  actions: unknown;
};

function firstNameFromUser(
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null,
) {
  if (!user) return "there";
  const meta = user.user_metadata ?? {};
  const full = meta.full_name;
  if (typeof full === "string" && full.trim()) return full.trim().split(/\s+/)[0]!;
  const first = meta.first_name;
  if (typeof first === "string" && first.trim()) return first.trim();
  const email = user.email;
  if (email && email.includes("@")) return email.split("@")[0]!;
  return "there";
}

function parseNumberLike(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function formatDisplay(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v.trim() || "—";
  return String(v);
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

function renderMarkdownInlineLinks(text: string): ReactNode {
  const t = text.trim();
  if (!t || t === "—") return t || "—";
  const re = /\[([^\]]+)\((https?:\/\/[^)\s]+)\)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    if (m.index > last) nodes.push(t.slice(last, m.index));
    nodes.push(
      <a
        key={`md-${m.index}`}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline decoration-[#00C9A7]/50 underline-offset-2"
        style={{ color: TEAL }}
      >
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < t.length) nodes.push(t.slice(last));
  return nodes.length > 0 ? nodes : t;
}

function displayActionText(action: unknown): string {
  const text = formatDisplay(action);
  switch (text) {
    case "Focus extra payments on your Lend Direct line of credit this month to reduce its 95% utilization.":
      return "Pay $50+ extra on your Lend Direct line this month (currently 95% used).";
    case "Confirm your pre-authorized payments are running smoothly on all accounts including Consumer Proposal payments.":
      return "Confirm pre-authorized payments are active on every account.";
    case "Confirm pre-authorized payments are active on every account, including your Consumer Proposal.":
      return "Confirm pre-authorized payments are active on every account.";
    case "Maintain your hard inquiry freeze — absolutely no new credit applications this month.":
      return "Don't apply for any new credit this month.";
    default:
      return text;
  }
}

function scoreToPercent(score: number, capPercent = 100): number {
  const raw = ((score - SCORE_SCALE_MIN) / (SCORE_SCALE_MAX - SCORE_SCALE_MIN)) * 100;
  return Math.min(capPercent, Math.max(0, raw));
}

function scoreRangeLabel(low: number | null, high: number | null): string {
  if (low === null || high === null) return "—";
  return `${low}–${high}`;
}

function countdownLabel(unlockAtMs: number | null, nowMs: number): string {
  if (unlockAtMs === null) return "0d 0h 0m";
  const remainingMs = unlockAtMs - nowMs;
  if (remainingMs <= 0) return "0d 0h 0m";
  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

type PathRowProps = {
  label: string;
  value: string;
  low: number | null;
  high: number | null;
  tone: "grey" | "teal" | "projection1" | "projection2" | "projection3";
};

function PathRow({ label, value, low, high, tone }: PathRowProps) {
  const barColor =
    tone === "grey"
      ? "rgba(15, 25, 35, 0.3)"
      : tone === "teal"
        ? TEAL
        : tone === "projection1"
          ? "rgba(0, 201, 167, 0.55)"
          : tone === "projection2"
            ? "rgba(0, 201, 167, 0.38)"
            : "rgba(0, 201, 167, 0.24)";
  const endScore = high ?? low ?? SCORE_SCALE_MIN;
  const capPercent = tone === "grey" || tone === "teal" ? 100 : PROJECTED_BAR_MAX_PERCENT;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-[#0F1923]/70">{label}</span>
        <span className="tabular-nums" style={{ color: tone === "grey" ? "rgba(15,25,35,0.7)" : TEAL }}>
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E7ECEF]">
        <div className="h-full rounded-full" style={{ width: `${scoreToPercent(endScore, capPercent)}%`, backgroundColor: barColor }} />
      </div>
    </div>
  );
}

export default function ActionsV2Page() {
  const router = useRouter();
  const { user, loading: authLoading, headingFontClass, hasDashboardAccess } = useDashboardAuth();
  const firstName = firstNameFromUser(user);
  const h = headingFontClass;
  const [checkoutActivating, setCheckoutActivating] = useState(false);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [monthlyPlanRow, setMonthlyPlanRow] = useState<MonthlyPlanRow | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(true);
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set());
  const completionsRef = useRef<Set<number>>(new Set());
  const [actionsCompletedTotal, setActionsCompletedTotal] = useState(0);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [brandonDismissed, setBrandonDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("brandon_card_dismissed") === "true",
  );
  const [eqDismissed, setEqDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("eq_card_dismissed") === "true",
  );
  const [paywallUnlockBusy, setPaywallUnlockBusy] = useState(false);
  const [paywallUnlockError, setPaywallUnlockError] = useState("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [showMonthCompletionOverlay, setShowMonthCompletionOverlay] = useState(false);

  const loadBlueprint = useCallback(async () => {
    if (!user) return;
    setBlueprintLoading(true);
    const { data: clientData } = await supabase.from("clients").select("created_at").eq("id", user.id).maybeSingle();
    setEnrolledAt(typeof clientData?.created_at === "string" ? clientData.created_at : null);
    const { data, error } = await supabase
      .from("blueprints")
      .select(
        "id, client_id, month_number, status, raw_parse_data, blueprint_data, created_at, updated_at, current_month, month_unlocked_at",
      )
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setBlueprint(null);
      setMonthlyPlanRow(null);
    } else {
      const latest = data as BlueprintRow | null;
      setBlueprint(latest);
      if (latest?.id) {
        const progMonth = normalizeProgramMonth(latest.current_month);
        if (progMonth >= 2 && progMonth <= MAX_THEMED_PROGRAM_MONTH) {
          const { data: mp, error: mpErr } = await supabase
            .from("monthly_plans")
            .select("month_number, theme, actions")
            .eq("blueprint_id", latest.id)
            .eq("month_number", progMonth)
            .maybeSingle();
          setMonthlyPlanRow(mpErr ? null : (mp as MonthlyPlanRow | null));
        } else {
          setMonthlyPlanRow(null);
        }
      } else {
        setMonthlyPlanRow(null);
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
    completionsRef.current = completedSet;
  }, [completedSet]);

  useEffect(() => {
    if (!user?.id || !blueprint?.id) {
      queueMicrotask(() => {
        const empty = new Set<number>();
        completionsRef.current = empty;
        setCompletedSet(empty);
        setActionsCompletedTotal(0);
      });
      return;
    }
    const programMonth = normalizeProgramMonth(blueprint.current_month);
    let cancelled = false;
    void (async () => {
      const { data, error: qErr } = await supabase
        .from("action_completions")
        .select("program_month, action_index")
        .eq("client_id", user.id)
        .eq("blueprint_id", blueprint.id);
      if (cancelled) return;
      if (qErr) {
        logPostgrestError("[actions-v2] action_completions select failed", qErr, {
          client_id: user.id,
          blueprint_id: blueprint.id,
          program_month: programMonth,
        });
        const empty = new Set<number>();
        completionsRef.current = empty;
        setCompletedSet(empty);
        setActionsCompletedTotal(0);
        return;
      }
      const indexes = new Set<number>();
      const rows = (data ?? []) as Array<{ program_month?: number | null; action_index?: number | null }>;
      for (const row of rows) {
        const rowMonth = typeof row.program_month === "number" && Number.isFinite(row.program_month) ? row.program_month : 1;
        if (rowMonth !== programMonth) continue;
        if (typeof row.action_index === "number" && Number.isFinite(row.action_index)) {
          indexes.add(row.action_index);
        }
      }
      completionsRef.current = indexes;
      setCompletedSet(indexes);
      setActionsCompletedTotal(rows.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [blueprint?.id, blueprint?.current_month, user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
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

  const startPaywallCheckout = useCallback(async () => {
    setPaywallUnlockError("");
    setPaywallUnlockBusy(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setPaywallUnlockError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setPaywallUnlockError("Checkout did not return a URL.");
    } catch {
      setPaywallUnlockError("Network error.");
    } finally {
      setPaywallUnlockBusy(false);
    }
  }, []);

  const parsed = blueprint?.raw_parse_data as ParsedBureau | null | undefined;
  const plan = blueprint?.blueprint_data as BlueprintPlan | null | undefined;
  const consumerProposal = parsed?.consumer_proposal === true;

  const enrollmentDays = useMemo(() => {
    if (!enrolledAt) return 0;
    const created = new Date(enrolledAt).getTime();
    if (!Number.isFinite(created)) return 0;
    return Math.max(0, Math.floor((nowMs - created) / (24 * 60 * 60 * 1000)));
  }, [enrolledAt, nowMs]);

  const tradelines = Array.isArray(parsed?.tradelines) ? parsed.tradelines : [];
  const collections = Array.isArray(parsed?.collections) ? parsed.collections : [];
  const currentMonth = normalizeProgramMonth(blueprint?.current_month);
  const nextMonth = currentMonth + 1;
  const hasBlueprint = Boolean(blueprint) && !blueprintLoading;

  const equifaxScore = (() => {
    const raw = parsed as { equifax_score?: number; score?: { equifax_score?: number } } | null | undefined;
    const s = (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? raw?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(900, Math.max(300, s))) : null;
  })();

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
    const lateViaColumns =
      parseNumberLike(t?.late_30) > 0 || parseNumberLike(t?.late_60) > 0 || parseNumberLike(t?.late_90) > 0;
    return lateViaRating || lateViaColumns;
  });
  const hasCollectionsOnFile = collections.length > 0;
  const monthsClean = calculateMonthsClean(createdAt, new Date(nowMs));
  const daysInProgram =
    createdAt && Number.isFinite(createdAt.getTime())
      ? Math.max(0, Math.floor((nowMs - createdAt.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;
  const revolvingNetworkCount =
    typeof plan?.credit_cards_reporting === "number" && Number.isFinite(plan.credit_cards_reporting)
      ? Math.max(0, Math.floor(plan.credit_cards_reporting))
      : tradelines.filter(isNetworkCard).length;
  const estimatedGain = !hasAnyLate && !hasCollectionsOnFile ? Math.min(80, monthsElapsed * 8) : 0;
  const estimatedScore =
    equifaxScore !== null ? Math.min(900, Math.max(300, Math.round(equifaxScore + estimatedGain))) : null;
  const estimatedRangeStart = estimatedScore;
  const estimatedRangeEnd = estimatedScore !== null ? Math.min(900, Math.max(300, Math.round(estimatedScore + 15))) : null;

  const monthlyProgramActions: MonthlyProgramAction[] = useMemo(() => {
    if (!blueprint || !parsed) return [];
    if (currentMonth === 1) {
      return buildFoundationMonthActions(parsed);
    }
    if (currentMonth >= 2 && currentMonth <= MAX_THEMED_PROGRAM_MONTH) {
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
  }, [blueprint, parsed, currentMonth, monthlyPlanRow?.actions]);

  const nextUnlockMeta = useMemo(() => {
    if (!blueprint || currentMonth >= 4) {
      return { unlockAtMs: null as number | null, nextMonth: nextMonth };
    }
    const unlockedAt = blueprint.month_unlocked_at ?? blueprint.created_at;
    const gateMs = new Date(unlockedAt ?? "").getTime();
    if (!Number.isFinite(gateMs)) {
      return { unlockAtMs: null, nextMonth };
    }
    return { unlockAtMs: gateMs + TWENTY_EIGHT_DAYS_MS, nextMonth };
  }, [blueprint, currentMonth, nextMonth]);

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
    const j = (await res.json()) as { ok?: boolean; updated?: boolean };
    if (j.ok && j.updated) {
      await loadBlueprint();
    }
  }, [loadBlueprint, user?.id]);

  const saveCompletion = useCallback(
    async (index: number, action: MonthlyProgramAction) => {
      if (!user?.id || !blueprint?.id) return;
      const blueprintId = blueprint.id;
      const programMonth = normalizeProgramMonth(blueprint.current_month);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      if (completionsRef.current.has(index)) {
        completionsRef.current.delete(index);
        const res = await fetch(`${origin}/api/action-completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            blueprintId,
            programMonth,
            actionIndex: index,
            completed: false,
          }),
        });
        if (!res.ok) {
          completionsRef.current.add(index);
          return;
        }
        setCompletedSet((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        setActionsCompletedTotal((prev) => Math.max(0, prev - 1));
        void runSyncProgress();
        return;
      }

      completionsRef.current.add(index);
      const actionText = typeof action?.action === "string" ? action.action : formatDisplay(action?.action);
      const res = await fetch(`${origin}/api/action-completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          blueprintId,
          programMonth,
          actionIndex: index,
          actionText,
          completed: true,
        }),
      });
      if (!res.ok) {
        completionsRef.current.delete(index);
        return;
      }
      setCompletedSet((prev) => new Set([...prev, index]));
      setActionsCompletedTotal((prev) => prev + 1);
      const nextCompleted = new Set([...completionsRef.current]);
      nextCompleted.add(index);
      const allDoneNow = [0, 1, 2].every((i) => nextCompleted.has(i)) && monthlyProgramActions.length >= 3;
      if (allDoneNow && programMonth > 0 && programMonth < 5 && typeof window !== "undefined") {
        const key = `actions_v2_celebration_shown_month_${programMonth}`;
        if (window.localStorage.getItem(key) !== "1") {
          setShowMonthCompletionOverlay(true);
        }
      }
      void runSyncProgress();
    },
    [blueprint, monthlyProgramActions.length, runSyncProgress, user?.id],
  );

  const showBrandonCard = enrollmentDays >= 3 && !brandonDismissed;
  const showEqCard = enrollmentDays >= 7 && !eqDismissed && !consumerProposal;
  const monthOneActions = (Array.isArray(plan?.top_actions) ? plan.top_actions : [])
    .map((a) => (typeof a?.action === "string" ? a.action.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading"
        />
        <p className={`text-sm opacity-70 ${h}`}>Loading…</p>
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

  if (!hasDashboardAccess && blueprintLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading"
        />
        <p className={`text-sm opacity-70 ${headingFontClass}`}>Loading your dashboard…</p>
      </div>
    );
  }

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

        <section className="grid gap-4">
          <div
            className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F1923]/60">Equifax Score</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${h}`} style={{ color: NAVY }}>
              {equifaxScore ?? "—"}
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
                style={idx === 2 ? { filter: "blur(4px)", userSelect: "none" } : undefined}
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
            {paywallUnlockError ? (
              <p className="mt-3 text-center text-sm text-red-600">{paywallUnlockError}</p>
            ) : null}
            <button
              type="button"
              disabled={paywallUnlockBusy}
              onClick={() => void startPaywallCheckout()}
              className={`mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#0F1923] px-5 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${h}`}
            >
              {paywallUnlockBusy ? "Redirecting…" : "Unlock My Blueprint — Free for 30 Days"}
            </button>
            <p className="mt-2 text-center text-xs font-medium text-[#0F1923]/80">
              You&apos;ll be sent to Stripe&apos;s secure checkout.
            </p>
          </div>
          <div className="h-40" aria-hidden />
        </section>
      </div>
    );
  }

  if (blueprintLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading"
        />
        <p className={`text-sm opacity-70 ${h}`}>Loading your actions…</p>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-4xl space-y-5 ${h}`} style={{ color: NAVY }}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm font-medium text-[#0F1923]/60">Here&apos;s your focus this month</p>
        </div>
        <span
          className="inline-flex w-fit items-center rounded-full border px-4 py-1.5 text-sm font-bold"
          style={{ borderColor: TEAL, color: TEAL, backgroundColor: "rgba(0, 201, 167, 0.12)" }}
        >
          Month {currentMonth} of {TOTAL_MONTHS}
        </span>
      </header>

      {hasBlueprint && equifaxScore !== null ? (
        <section className="rounded-2xl bg-white px-[1.1rem] py-4 shadow-sm sm:p-5" style={{ border: `1.5px solid ${TEAL}` }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0F1923]/50">Current Score</p>
              <p className="mt-1 text-[36px] font-extrabold leading-none tabular-nums sm:text-[44px]">{equifaxScore}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold text-[#0F1923]/55">Where this month could take you</p>
              <p className="mt-1 text-lg font-extrabold leading-none tabular-nums sm:text-2xl" style={{ color: TEAL }}>
                {scoreRangeLabel(estimatedRangeStart, estimatedRangeEnd)}
              </p>
            </div>
          </div>
          <div className="my-4 h-px bg-[#0F1923]/10" />
          <details open className="space-y-3 md:hidden">
            <summary className="cursor-pointer list-none text-xs font-extrabold leading-none" style={{ color: TEAL }}>
              📈 Your path
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1923]/35">
                <span>380</span>
                <span>750</span>
              </div>
              <PathRow label="Month 1" value={String(equifaxScore)} low={equifaxScore} high={equifaxScore} tone="grey" />
              <PathRow
                label="Month 2"
                value={scoreRangeLabel(estimatedRangeStart, estimatedRangeEnd)}
                low={estimatedRangeStart}
                high={estimatedRangeEnd}
                tone="teal"
              />
            </div>
          </details>
          <div className="hidden space-y-3 md:block">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1923]/35">
              <span>380</span>
              <span>750</span>
            </div>
            <PathRow label="Month 1" value={String(equifaxScore)} low={equifaxScore} high={equifaxScore} tone="grey" />
            <PathRow
              label="Month 2"
              value={scoreRangeLabel(estimatedRangeStart, estimatedRangeEnd)}
              low={estimatedRangeStart}
              high={estimatedRangeEnd}
              tone="teal"
            />
          </div>
        </section>
      ) : null}

      {hasBlueprint ? (
        <section id="monthly-actions" className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex flex-col gap-1">
            <h2 className={`text-lg font-bold ${h}`}>
              Month {currentMonth} — {getProgramMonthThemeTitle(currentMonth)}
            </h2>
            <p className="text-[13px] font-medium text-[#0F1923]/60 sm:text-sm">Check each off as you go.</p>
          </div>

          {currentMonth >= 2 && currentMonth <= MAX_THEMED_PROGRAM_MONTH && monthlyProgramActions.length === 0 ? (
            <p className="mt-4 text-sm text-[#0F1923]/65">
              Your personalized plan for this month is being prepared. Refresh the page in a moment — if this message
              persists, contact Credit Path Canada.
            </p>
          ) : monthlyProgramActions.length > 0 ? (
            <>
              <ol className="mt-4 space-y-2.5">
                {monthlyProgramActions.slice(0, 3).map((item, idx) => {
                  const done = completedSet.has(idx);
                  const canSave = Boolean(user?.id && blueprint?.id);
                  const impactLine = [formatDisplay(item.impact), formatDisplay(item.timeline)]
                    .filter((x) => x !== "—")
                    .join(" · ")
                    .replace("Reduces utilization impact significantly · This month", "Lowers your utilization · This month")
                    .replace("Prevents further score damage · All month", "Protects your score · All month");
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-3"
                      style={{
                        border: "1.5px solid",
                        borderColor: done ? "rgba(0, 201, 167, 0.48)" : "rgba(15, 25, 35, 0.08)",
                        backgroundColor: done ? "rgba(0, 201, 167, 0.06)" : "#fff",
                      }}
                    >
                      <button
                        type="button"
                        className="mt-0.5 flex shrink-0 items-center justify-center rounded border text-[13px] font-extrabold leading-none disabled:cursor-default"
                        style={{
                          width: 24,
                          height: 24,
                          borderColor: done ? TEAL : "rgba(15,25,35,0.25)",
                          backgroundColor: done ? TEAL : "transparent",
                          color: done ? "#FFFFFF" : NAVY,
                          WebkitAppearance: "none",
                          appearance: "none",
                        }}
                        disabled={!canSave}
                        aria-label={done ? "Mark action not complete" : "Mark action complete"}
                        onClick={() => void saveCompletion(idx, item)}
                      >
                        {done ? "✓" : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-bold leading-snug sm:text-sm ${done ? "line-through" : ""}`} style={{ color: done ? TEAL : NAVY }}>
                          {renderMarkdownInlineLinks(displayActionText(item.action))}
                        </p>
                        {impactLine ? (
                          <p className={`mt-1 text-xs font-bold leading-snug ${done ? "line-through" : ""}`} style={{ color: TEAL }}>
                            {impactLine}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
                <span style={{ color: TEAL }}>{completedSet.size} of 3 completed</span>
                <span className="text-[#0F1923]/60">
                  Month {nextUnlockMeta.nextMonth} unlocks in {countdownLabel(nextUnlockMeta.unlockAtMs, nowMs)}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-[#0F1923]/45">
                Based on your file. Results vary.
              </p>
            </>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Activate your Blueprint</h2>
              <p className="mt-1 text-sm text-[#0F1923]/70">Upload your Borrowell report to activate your actions.</p>
            </div>
            <Link
              href="/dashboard/upload"
              className="inline-flex shrink-0 items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-[#0F1923] transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Upload report
            </Link>
          </div>
        </section>
      )}

      {hasBlueprint ? (
        <section className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: NAVY, color: "#E9F5F3" }}>
          <h2 className={`text-lg font-extrabold ${h}`}>Your Progress</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: "🛡️",
                label: "Months clean",
                value: monthsClean,
                sublabel: "No new damage",
              },
              {
                icon: "✓✓",
                label: "Actions completed",
                value: actionsCompletedTotal,
                sublabel: "Since you started",
              },
              {
                icon: "⏳",
                label: "Days in the program",
                value: daysInProgram,
                sublabel: "Building your file",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white/80">
                  <span aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <p className={`mt-3 text-3xl font-extrabold tabular-nums ${h}`} style={{ color: TEAL }}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-white/55">{item.sublabel}</p>
              </div>
            ))}
          </div>
          <p
            className="mt-4 rounded-xl border px-4 py-3 text-sm font-semibold leading-relaxed"
            style={{ borderColor: "rgba(0, 201, 167, 0.45)", backgroundColor: "rgba(0, 201, 167, 0.12)", color: "#E9F5F3" }}
          >
            This is exactly what the banks want to see. Keep going — you&apos;re building the file that gets you approved.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border-l-4 p-4 shadow-sm" style={{ backgroundColor: NAVY, borderLeftColor: TEAL }} role="alert">
        <p className="text-sm font-bold leading-relaxed" style={{ color: "#B45309" }}>
          Before applying anywhere, contact us first. If you receive a text or call saying you are approved — do not respond.
        </p>
      </section>

      <section className="rounded-2xl border-2 p-5 shadow-sm" style={{ backgroundColor: NAVY, borderColor: TEAL, color: "#E9F5F3" }}>
        <p className="text-base font-extrabold leading-snug sm:text-lg">🚗 Your vehicle upgrade window opens at Month {UPGRADE_MONTH}.</p>
        <a
          href="mailto:michaelf@titaniumford.ca"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-extrabold transition-opacity hover:opacity-92 sm:w-auto"
          style={{ backgroundColor: TEAL, color: NAVY }}
        >
          Talk to Michael — Titanium Ford Finance Director
        </a>
      </section>

      <details className="space-y-4" style={{ color: NAVY }}>
        <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-bold ${h}`}>
          <span>Recommended credit products</span>
          <span aria-hidden style={{ color: TEAL }}>+</span>
        </summary>
        <p className="rounded-xl border border-[rgba(15,25,35,0.1)] bg-[rgba(0,201,167,0.08)] px-4 py-3 text-sm font-medium leading-relaxed text-[#0F1923]/85">
          You have {revolvingNetworkCount} of 3 recommended cards.
        </p>
        <div className="space-y-2 md:hidden">
          {CREDIT_PRODUCT_OFFERS.map((product) => (
            <div
              key={product.name}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white px-3 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-sm font-bold ${h}`} style={{ color: NAVY }}>
                  {product.name}
                </h3>
                {product.name === "Tangerine Money-Back Credit Card" ? (
                  <p style={{ color: TEAL, fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                    💸 Use referral code 79976711S1 for a $50 bonus.
                  </p>
                ) : null}
              </div>
              <a
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-xs font-bold text-[#0F1923] transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                {product.cta === "Get started" ? "Start" : "Apply"}
              </a>
            </div>
          ))}
        </div>
        <div className="hidden grid-cols-1 gap-4 md:grid lg:grid-cols-3 lg:items-stretch">
          {CREDIT_PRODUCT_OFFERS.map((product) => (
            <div key={product.name} className="flex min-h-0 flex-1 flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="min-w-0 flex-1">
                <h3 className={`text-base font-bold ${h}`} style={{ color: NAVY }}>
                  {product.name}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#0F1923]/65">{product.description}</p>
                {product.name === "Tangerine Money-Back Credit Card" ? (
                  <p style={{ color: TEAL, fontSize: 13, marginTop: 6, fontWeight: 600 }}>
                    💸 Use referral code 79976711S1 for a $50 bonus.
                  </p>
                ) : null}
              </div>
              <a
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-[#0F1923] transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                {product.cta}
              </a>
            </div>
          ))}
        </div>
      </details>

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
                    backgroundColor: i % 2 === 0 ? TEAL : "#FFFFFF",
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="relative z-10 mx-auto w-full max-w-xl text-center">
            <p className="text-6xl" style={{ lineHeight: 1.1, color: TEAL }}>
              🏆
            </p>
            <p className="mt-5 text-3xl font-extrabold" style={{ color: "#FFFFFF" }}>
              🏆 You crushed Month {currentMonth}.
            </p>
            <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.86)" }}>
              Every action complete. Your progress is locked in. Keep this momentum going.
            </p>
            <button
              type="button"
              className="mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-extrabold"
              style={{ backgroundColor: TEAL, color: NAVY }}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(`actions_v2_celebration_shown_month_${currentMonth}`, "1");
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
