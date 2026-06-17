"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { logPostgrestError } from "@/lib/log-postgrest-error";
import { buildFoundationMonthActions, type MonthlyProgramAction } from "@/lib/monthly-program-actions";
import {
  getProgramMonthThemeSubtitle,
  getProgramMonthThemeTitle,
  MAX_THEMED_PROGRAM_MONTH,
  normalizeProgramMonth,
} from "@/lib/monthly-progression-themes";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const TOTAL_MONTHS = 24;
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
  month_unlocked_at?: string | null;
};

type MonthlyPlanRow = {
  month_number: number;
  theme: string | null;
  actions: unknown;
};

const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;

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

function renderMarkdownInlineLinks(text: string): React.ReactNode {
  const t = text.trim();
  if (!t || t === "—") return t || "—";
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  const nodes: React.ReactNode[] = [];
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

export default function DashboardPage() {
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
        logPostgrestError("[dashboard] action_completions select failed", qErr, {
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
  const equifaxScore = (() => {
    const raw = parsed as { equifax_score?: number; score?: { equifax_score?: number } } | null | undefined;
    const s = (typeof raw?.equifax_score === "number" ? raw.equifax_score : undefined) ?? raw?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(900, Math.max(300, s))) : null;
  })();

  const currentMonth = normalizeProgramMonth(blueprint?.current_month);

  const hasBlueprint = Boolean(blueprint) && !blueprintLoading;

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
  const estimatedGain = !hasAnyLate && !hasCollections ? Math.min(80, monthsElapsed * 8) : 0;
  const estimatedScore =
    equifaxScore !== null
      ? Math.min(900, Math.max(300, Math.round(equifaxScore + estimatedGain)))
      : null;
  const estimatedRangeStart = estimatedScore;
  const estimatedRangeEnd =
    estimatedScore !== null ? Math.min(900, Math.max(300, Math.round(estimatedScore + 15))) : null;

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

  const allCurrentMonthActionsDone = useMemo(() => {
    if (monthlyProgramActions.length < 3) return false;
    return [0, 1, 2].every((i) => completedSet.has(i));
  }, [monthlyProgramActions.length, completedSet]);

  const nextUnlockMeta = useMemo(() => {
    if (!blueprint || currentMonth >= 4) {
      return { unlockAtMs: null as number | null, nextMonth: null as number | null };
    }
    const unlockedAt = blueprint.month_unlocked_at ?? blueprint.created_at;
    const gateMs = new Date(unlockedAt ?? "").getTime();
    if (!Number.isFinite(gateMs)) {
      return { unlockAtMs: null, nextMonth: currentMonth + 1 };
    }
    return { unlockAtMs: gateMs + TWENTY_EIGHT_DAYS_MS, nextMonth: currentMonth + 1 };
  }, [blueprint, currentMonth]);

  const nextUnlockBadgeText = useMemo(() => {
    const nextMonth = nextUnlockMeta.nextMonth;
    const unlockAtMs = nextUnlockMeta.unlockAtMs;
    if (nextMonth == null || unlockAtMs == null) return "";

    const remainingMs = unlockAtMs - nowMs;
    if (remainingMs > 0) {
      const totalMinutes = Math.floor(remainingMs / (60 * 1000));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      return `Month ${nextMonth} unlocks in: ${days}d ${hours}h ${minutes}m`;
    }
    if (allCurrentMonthActionsDone) {
      return `Month ${nextMonth} is ready. Check your blueprint.`;
    }
    return `Complete your actions to unlock Month ${nextMonth}.`;
  }, [allCurrentMonthActionsDone, nextUnlockMeta.nextMonth, nextUnlockMeta.unlockAtMs, nowMs]);

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
      void runSyncProgress();
    },
    [blueprint, runSyncProgress, user?.id],
  );

  const showBrandonCard = enrollmentDays >= 3 && !brandonDismissed;
  const showEqCard = enrollmentDays >= 7 && !eqDismissed && !consumerProposal;
  const rebuildScoreNumber =
    typeof plan?.rebuild_score === "number" && Number.isFinite(plan.rebuild_score) ? Math.round(plan.rebuild_score) : null;
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

  return (
    <div className="mx-auto max-w-4xl space-y-8" style={{ color: NAVY }}>
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

      <section
        className="rounded-xl border-l-4 p-4 shadow-sm"
        style={{ backgroundColor: NAVY, borderLeftColor: TEAL, color: "#E9F5F3" }}
        role="alert"
      >
        <p className={`text-sm font-semibold leading-relaxed ${h}`}>
          Do not apply for credit anywhere without contacting us first. If you receive a text or call saying you are approved — do not respond.
        </p>
      </section>

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

      {hasBlueprint && equifaxScore !== null && estimatedRangeStart !== null && estimatedRangeEnd !== null ? (
        <section
          className={`rounded-2xl p-6 shadow-lg sm:p-8 ${h}`}
          style={{
            backgroundColor: NAVY,
            color: "#fff",
            boxShadow: "0 12px 40px rgba(15, 25, 35, 0.25)",
          }}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 w-full flex-1 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
                Current Score
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums leading-none tracking-tight text-white">
                {equifaxScore}
              </p>
            </div>

            <div className="min-w-0 w-full flex-1 text-center sm:text-right">
              <p className="text-sm font-semibold leading-relaxed text-white/60">
                Where this month&apos;s actions could take you
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums leading-none tracking-tight" style={{ color: TEAL }}>
                {estimatedRangeStart}–{estimatedRangeEnd}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {hasBlueprint ? (
        currentMonth >= 5 ? (
          <section
            id="monthly-actions"
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <h2 className={`text-lg font-bold ${h}`}>Program progression</h2>
            <p className={`mt-2 text-sm leading-relaxed text-[#0F1923]/75 ${h}`}>
              {getProgramMonthThemeTitle(currentMonth)} — {getProgramMonthThemeSubtitle(currentMonth)}
            </p>
          </section>
        ) : (
          <section
            id="monthly-actions"
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <h2 className={`text-lg font-bold ${h}`}>Top actions</h2>
            <p className="mt-1 text-sm text-[#0F1923]/65">
              Check each action when complete to track your progress.
            </p>
            <p className={`mt-3 text-base font-bold leading-snug ${h}`} style={{ color: TEAL }}>
              Month {currentMonth}: {getProgramMonthThemeTitle(currentMonth)}
            </p>
            <p className={`mt-1 text-sm leading-relaxed text-[#0F1923]/70 ${h}`}>
              {getProgramMonthThemeSubtitle(currentMonth)}
            </p>

            {nextUnlockMeta.nextMonth != null && currentMonth < 4 ? (
              <p className="mt-4 rounded-xl border border-black/10 bg-[#F5F7FA] px-4 py-3 text-sm leading-relaxed text-[#0F1923]/75">
                Month {nextUnlockMeta.nextMonth} unlocks when all actions are complete and 28 days have passed.
              </p>
            ) : null}

            {currentMonth >= 2 && currentMonth <= MAX_THEMED_PROGRAM_MONTH && monthlyProgramActions.length === 0 ? (
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
                          border: "1.5px solid #00C9A7",
                          borderRadius: "8px",
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
                          <p
                            className={`text-sm font-bold leading-snug ${done ? "line-through" : ""} line-clamp-4 ${h}`}
                            style={{ color: done ? TEAL : NAVY }}
                          >
                            {renderMarkdownInlineLinks(formatDisplay(item.action))}
                          </p>
                          {impactLine ? (
                            <p
                              className={`mt-1 text-xs leading-snug text-[#0F1923]/55 ${done ? "line-through" : ""}`}
                              style={{ color: "#00C9A7" }}
                            >
                              {impactLine}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-[#0F1923]/45">
                            This is educational guidance based on your file. Individual results vary.
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-4 text-sm font-semibold" style={{ color: TEAL }}>
                  {completedSet.size} of {monthlyProgramActions.length}{" "}
                  {monthlyProgramActions.length === 1 ? "action" : "actions"} completed this month
                </p>
              </>
            ) : null}

            {currentMonth < 4 && nextUnlockBadgeText ? (
              <div
                className={`mt-4 inline-flex w-full max-w-full flex-wrap items-center justify-center gap-1 rounded-full border px-4 py-3 text-center text-sm font-semibold leading-snug sm:text-base ${h}`}
                style={{
                  borderColor: TEAL,
                  backgroundColor: "rgba(0, 201, 167, 0.18)",
                  color: NAVY,
                }}
                role="status"
                aria-live="polite"
              >
                {nextUnlockBadgeText}
              </div>
            ) : null}

            <div className="mt-6 border-t border-black/10 pt-5">
              <p className={`text-xs font-bold uppercase tracking-wide text-[#0F1923]/55 ${h}`}>Locked ahead</p>
              <ul className="mt-2 space-y-2 text-sm text-[#0F1923]/65">
                {Array.from({ length: Math.max(0, 5 - currentMonth) }, (_, i) => currentMonth + 1 + i).map((m) => (
                  <li key={m}>
                    <span className="font-semibold text-[#0F1923]/85">Month {m}</span> —{" "}
                    {m >= 5 ? getProgramMonthThemeTitle(5) : "Locked until you complete the prior month and wait window"}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )
      ) : (
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
      )}

    </div>
  );
}
