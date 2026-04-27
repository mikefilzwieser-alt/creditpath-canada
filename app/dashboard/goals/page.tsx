"use client";

import { Montserrat } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import {
  collectionsAgingOrEmpty,
  computeSeverityAdjustedRebuildScore,
  equifaxScoreFromParsed,
  getMonthlyProgramActionCount,
  hasAnyLateTradelines,
  numericValue,
  utilizationPercent,
  type BlueprintPlanLite,
  type ParsedBureauLite,
} from "@/lib/goals-milestone-helpers";
import { supabase } from "@/lib/supabase";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const BG = "#F5F7FA";

type GoalKey = "auto" | "refinance" | "mortgage" | "score" | "business" | "emergency";

type MilestoneCtx = {
  hasBureau: boolean;
  util: number | null;
  equifax: number | null;
  rebuild: number;
  topActionCount: number;
  completedCount: number;
  allActionsDone: boolean;
  plan: BlueprintPlanLite | null;
  parsed: ParsedBureauLite | null;
  hasLate: boolean;
  onTimePct: number | null;
};

type MilestoneDef = { label: string; test: (c: MilestoneCtx) => boolean };

const MILESTONES: Record<GoalKey, MilestoneDef[]> = {
  auto: [
    { label: "Bureau uploaded and analyzed", test: (c) => c.hasBureau },
    { label: "Pre-authorized payments set up", test: (c) => !c.plan?.pre_auth_required },
    { label: "Utilization under 50%", test: (c) => c.util !== null && c.util < 50 },
    { label: "Utilization under 30%", test: (c) => c.util !== null && c.util < 30 },
    { label: "All monthly actions completed", test: (c) => c.allActionsDone },
    { label: "Score above 620", test: (c) => c.equifax !== null && c.equifax >= 620 },
    {
      label: "Auto loan ready",
      test: (c) =>
        Boolean(c.plan?.auto_ready_alert) ||
        (typeof c.plan?.readiness_percentage === "number" &&
          Number.isFinite(c.plan.readiness_percentage) &&
          c.plan.readiness_percentage >= 70),
    },
  ],
  refinance: [
    { label: "Bureau uploaded and analyzed", test: (c) => c.hasBureau },
    { label: "Utilization under 40%", test: (c) => c.util !== null && c.util < 40 },
    {
      label: "No missed payments in 6 months",
      test: (c) => !c.hasLate && c.onTimePct !== null && c.onTimePct >= 98,
    },
    { label: "Score above 650", test: (c) => c.equifax !== null && c.equifax >= 650 },
    {
      label: "Refinance ready",
      test: (c) =>
        c.rebuild >= 62 &&
        c.util !== null &&
        c.util < 38 &&
        !c.hasLate &&
        c.equifax !== null &&
        c.equifax >= 640,
    },
  ],
  mortgage: [
    { label: "Bureau uploaded and analyzed", test: (c) => c.hasBureau },
    { label: "Collections resolved or aging off", test: (c) => collectionsAgingOrEmpty(c.parsed) },
    { label: "Utilization under 35%", test: (c) => c.util !== null && c.util < 35 },
    { label: "Score above 680", test: (c) => c.equifax !== null && c.equifax >= 680 },
    {
      label: "Mortgage ready",
      test: (c) =>
        c.equifax !== null &&
        c.equifax >= 700 &&
        c.rebuild >= 72 &&
        c.util !== null &&
        c.util < 32,
    },
  ],
  score: [
    { label: "Bureau uploaded and analyzed", test: (c) => c.hasBureau },
    { label: "Monthly actions completed", test: (c) => c.allActionsDone },
    { label: "Utilization improving", test: (c) => c.util !== null && c.util < 45 },
    {
      label: "Score trending upward",
      test: (c) => c.rebuild >= 58 || (c.equifax !== null && c.equifax >= 620),
    },
    { label: "Target score reached", test: (c) => c.equifax !== null && c.equifax >= 700 },
  ],
  business: [
    { label: "Bureau uploaded and analyzed", test: (c) => c.hasBureau },
    {
      label: "Personal credit stabilized",
      test: (c) => c.rebuild >= 55 && !c.hasLate && c.onTimePct !== null && c.onTimePct >= 95,
    },
    { label: "Utilization under 30%", test: (c) => c.util !== null && c.util < 30 },
    { label: "Score above 650", test: (c) => c.equifax !== null && c.equifax >= 650 },
    {
      label: "Business credit ready",
      test: (c) => c.equifax !== null && c.equifax >= 680 && c.rebuild >= 65 && c.util !== null && c.util < 28,
    },
  ],
  emergency: [
    { label: "Bureau uploaded and analyzed", test: (c) => c.hasBureau },
    { label: "Utilization under 40%", test: (c) => c.util !== null && c.util < 40 },
    { label: "Score above 600", test: (c) => c.equifax !== null && c.equifax >= 600 },
    {
      label: "Line of credit ready",
      test: (c) =>
        c.equifax !== null && c.equifax >= 640 && c.rebuild >= 55 && c.util !== null && c.util < 35,
    },
  ],
};

function goalKeyFromPrimary(primary: string | null | undefined): GoalKey {
  const t = (primary ?? "").toLowerCase();
  if (t.includes("auto loan")) return "auto";
  if (t.includes("refinance")) return "refinance";
  if (t.includes("mortgage")) return "mortgage";
  if (t.includes("business credit")) return "business";
  if (t.includes("emergency")) return "emergency";
  return "score";
}

type BlueprintRow = {
  id?: string;
  raw_parse_data: ParsedBureauLite | null;
  blueprint_data: BlueprintPlanLite | null;
  status?: string;
  current_month?: number | null;
};

export default function GoalsPage() {
  const pathname = usePathname();
  const { user, loading: authLoading, headingFontClass } = useDashboardAuth();
  const h = headingFontClass || montserrat.className;
  const [loading, setLoading] = useState(true);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [clientRes, bpRes] = await Promise.all([
      supabase.from("clients").select("primary_goal").eq("id", user.id).maybeSingle(),
      supabase
        .from("blueprints")
        .select("id, raw_parse_data, blueprint_data, status, created_at, current_month")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const pg = (clientRes.data as { primary_goal?: string | null } | null)?.primary_goal;
    setPrimaryGoal(typeof pg === "string" && pg.trim() ? pg.trim() : null);

    const bp = bpRes.error ? null : (bpRes.data as BlueprintRow | null);
    setBlueprint(bp);

    if (bp?.id) {
      const progMonth =
        typeof (bp as { current_month?: number }).current_month === "number" &&
        Number.isFinite((bp as { current_month?: number }).current_month)
          ? Math.max(1, Math.floor((bp as { current_month: number }).current_month))
          : 1;
      const { count, error: compErr } = await supabase
        .from("action_completions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("blueprint_id", bp.id)
        .eq("program_month", progMonth)
        .in("action_index", [0, 1, 2]);
      if (compErr) {
        console.error("[goals] action_completions count failed", compErr);
      }
      setCompletedCount(compErr ? 0 : Math.min(3, count ?? 0));
    } else {
      setCompletedCount(0);
    }

    setLoading(false);
  }, [user]);

  // Re-run when the Goals tab is shown so completions stay in sync with the Blueprint checkboxes.
  useEffect(() => {
    if (!user || pathname !== "/dashboard/goals") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [user, pathname, load]);

  const parsed = blueprint?.raw_parse_data ?? null;
  const plan = blueprint?.blueprint_data ?? null;

  const hasBureau = Boolean(
    blueprint &&
      parsed &&
      typeof parsed === "object" &&
      (Object.keys(parsed).length > 0 || blueprint.status === "ready"),
  );

  const equifax = equifaxScoreFromParsed(parsed);
  const equifaxForRebuild = equifax ?? 0;
  const rebuild = useMemo(
    () => computeSeverityAdjustedRebuildScore(plan?.rebuild_score, parsed, equifaxForRebuild),
    [parsed, plan?.rebuild_score, equifaxForRebuild],
  );

  const util = utilizationPercent(parsed);
  const hasLate = hasAnyLateTradelines(parsed);
  const onTimePct = (() => {
    const v = parsed?.summary?.on_time_payment_percentage;
    const n = numericValue(v);
    return Number.isFinite(n) && n > 0 ? Math.min(100, n) : null;
  })();

  /** Matches blueprint page: three monthly program actions (months 1–4). */
  const topActionCount = useMemo(
    () => getMonthlyProgramActionCount((blueprint as { current_month?: number } | null)?.current_month),
    [blueprint],
  );
  const allActionsDone = topActionCount > 0 && completedCount === topActionCount;

  const ctx = useMemo<MilestoneCtx>(
    () => ({
      hasBureau,
      util,
      equifax,
      rebuild,
      topActionCount,
      completedCount,
      allActionsDone,
      plan,
      parsed,
      hasLate,
      onTimePct,
    }),
    [
      hasBureau,
      util,
      equifax,
      rebuild,
      topActionCount,
      completedCount,
      allActionsDone,
      plan,
      parsed,
      hasLate,
      onTimePct,
    ],
  );

  const goalKey = goalKeyFromPrimary(primaryGoal);
  const milestones = MILESTONES[goalKey];
  const milestoneStates = useMemo(() => {
    const rawDone = milestones.map((m) => m.test(ctx));
    return milestones.map((m, i) => ({
      label: m.label,
      /** Sequential: step i is complete only if every step 0..i passes (no green check ahead of a pending step). */
      done: rawDone.slice(0, i + 1).every(Boolean),
    }));
  }, [milestones, ctx]);

  const currentIndex = useMemo(() => {
    const i = milestoneStates.findIndex((s) => !s.done);
    return i === -1 ? milestoneStates.length - 1 : i;
  }, [milestoneStates]);

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

  const heroTitle = primaryGoal ?? "Your credit goal";
  const utilDisplay = util !== null ? `${util}%` : "—";
  const equifaxDisplay = equifax !== null ? String(equifax) : "—";
  const actionsThisMonthDisplay =
    blueprint?.id && topActionCount > 0 ? `${completedCount} / ${topActionCount}` : "—";

  return (
    <div className={`mx-auto max-w-2xl space-y-8 ${montserrat.className}`} style={{ color: NAVY, fontFamily: "inherit" }}>
      <section
        className="overflow-hidden rounded-2xl border-2 shadow-lg"
        style={{ borderColor: TEAL, backgroundColor: NAVY, color: "#fff" }}
      >
        <div className="flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:gap-6 sm:px-10">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl sm:size-20"
            style={{ backgroundColor: "rgba(0,201,167,0.2)", color: TEAL }}
            aria-hidden
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="sm:h-10 sm:w-10">
              <path
                d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
              Primary goal
            </p>
            <h1 className={`mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl ${h}`}>
              {heroTitle}
            </h1>
            {!primaryGoal ? (
              <p className="mt-2 text-sm text-white/70">
                We couldn&apos;t load a goal from your profile yet. Your advisor may still be finalizing your file.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-12">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
            aria-label="Loading goals"
          />
        </div>
      ) : (
        <>
          {goalKey === "auto" || goalKey === "refinance" ? (
            <div
              className="rounded-2xl border-2 bg-white p-6 shadow-sm sm:p-8"
              style={{ borderColor: TEAL }}
            >
              <p className={`text-sm leading-relaxed sm:text-base ${h}`}>
                🚗 Your vehicle upgrade window opens at{" "}
                <span style={{ color: TEAL }}>Month 8</span>.
              </p>
              <p className={`mt-2 text-sm leading-relaxed text-[#0F1923]/75 sm:text-base ${h}`}>
                Stay on track and we&apos;ll get you into something better.
              </p>
              <a
                href="mailto:michaelf@titaniumford.ca"
                className={`mt-5 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 ${h}`}
                style={{ backgroundColor: TEAL, color: NAVY }}
              >
                Talk to Michael — Titanium Ford Finance Director
              </a>
            </div>
          ) : null}

          <section
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <h2 className={`text-lg font-bold ${h}`}>Milestones</h2>
            <p className="mt-1 text-sm text-[#0F1923]/65">
              Progress for your selected goal. Steps marked complete use your latest bureau and blueprint data.
            </p>

            <ol className="relative mt-8 space-y-0">
              {milestoneStates.map((step, index) => {
                const done = step.done;
                const current = index === currentIndex && !done;
                const isLast = index === milestoneStates.length - 1;

                const futureText = "#94a3b8";
                const futureCircleBg = "#e2e8f0";
                const futureCircleNum = "#64748b";

                return (
                  <li key={step.label} className="relative flex gap-4 pb-10 last:pb-0">
                    {!isLast ? (
                      <div
                        className="absolute left-[15px] top-10 h-[calc(100%-0.5rem)] w-px"
                        style={{
                          backgroundColor: done ? TEAL : "rgba(148, 163, 184, 0.45)",
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <div className="relative z-[1] flex shrink-0 flex-col items-center">
                      <div
                        className="flex size-8 items-center justify-center rounded-full text-sm font-bold"
                        style={
                          done
                            ? { backgroundColor: TEAL, color: NAVY }
                            : current
                              ? {
                                  backgroundColor: NAVY,
                                  color: "#ffffff",
                                }
                              : {
                                  backgroundColor: futureCircleBg,
                                  color: futureCircleNum,
                                }
                        }
                      >
                        {done ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p
                        className={`text-sm leading-snug sm:text-base ${h}`}
                        style={{
                          color: done ? TEAL : current ? NAVY : futureText,
                          fontWeight: current ? 700 : done ? 600 : 500,
                        }}
                      >
                        {step.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
            style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <h2 className={`text-lg font-bold ${h}`}>Snapshot</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Current score", value: equifaxDisplay },
                { label: "Rebuild score", value: `${rebuild}` },
                { label: "Utilization", value: utilDisplay },
                {
                  label: "Actions this month",
                  value: actionsThisMonthDisplay,
                },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-xl border px-4 py-4"
                  style={{ borderColor: "rgba(15, 25, 35, 0.1)", backgroundColor: BG }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>
                    {cell.label}
                  </p>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${h}`}>{cell.value}</p>
                </div>
              ))}
            </div>
            {!hasBureau ? (
              <p className="mt-5 text-sm text-[#0F1923]/70">
                Upload your bureau report to unlock richer milestone tracking.
              </p>
            ) : null}
            <Link
              href="/dashboard/upload"
              className={`mt-5 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 ${h}`}
              style={{ backgroundColor: TEAL, color: NAVY }}
            >
              Upload new report
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
