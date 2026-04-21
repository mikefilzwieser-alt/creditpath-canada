"use client";

import Link from "next/link";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const TOTAL_MONTHS = 24;
const MONTH_THEMES: Record<number, string> = {
  1: "Foundation",
  2: "Stability",
  3: "Momentum",
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

function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const r = 52;
  const stroke = 8;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, score / maxScore));
  const offset = c * (1 - pct);

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden>
      <g transform="rotate(-90 80 80)">
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx="80"
          cy="80"
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
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, headingFontClass } = useDashboardAuth();
  const firstName = firstNameFromUser(user);
  const h = headingFontClass;
  const rawCurrentMonth = user?.user_metadata?.current_month;
  const currentMonth =
    typeof rawCurrentMonth === "number" && Number.isFinite(rawCurrentMonth)
      ? Math.max(1, Math.min(TOTAL_MONTHS, Math.round(rawCurrentMonth)))
      : 1;

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

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="flex flex-col items-center justify-center gap-4 rounded-2xl px-6 py-10 text-center shadow-lg sm:flex-row sm:text-left"
          style={{ backgroundColor: NAVY, color: "#fff" }}
        >
          <div className="relative flex items-center justify-center">
            <ScoreRing score={0} maxScore={850} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold tabular-nums ${h}`}>0</span>
            </div>
          </div>
          <div className="space-y-1 sm:pl-2">
            <p className={`text-sm font-medium uppercase tracking-wide text-white/60 ${h}`}>
              Rebuild Score
            </p>
            <p className={`text-xl font-semibold ${h}`} style={{ color: TEAL }}>
              Getting Started
            </p>
            <p className="max-w-xs text-sm text-white/70">
              Your score updates as you follow your blueprint and upload bureau data.
            </p>
          </div>
        </section>

        <section
          className="rounded-2xl border-2 bg-white p-6 shadow-sm"
          style={{ borderColor: TEAL }}
        >
          <h2 className={`text-lg font-bold ${h}`}>Your Blueprint is being prepared</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/70">
            We&apos;re building a personalized 24-month plan based on your goals. Upload your
            Borrowell report to unlock tailored actions and timelines.
          </p>
        </section>
      </div>

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

      <section className="grid gap-4 sm:grid-cols-3">
        {(["Utilization", "On-Time Payments", "Derogatory Marks"] as const).map((title) => (
          <div
            key={title}
            className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            style={{ backgroundColor: "#fff", borderColor: "rgba(15, 25, 35, 0.08)" }}
          >
            <h3 className={`text-sm font-semibold text-[#0F1923]/80 ${h}`}>{title}</h3>
            <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-[#0F1923]/35">
              —
            </p>
            <p className="mt-2 text-xs text-[#0F1923]/50">Available after bureau upload</p>
          </div>
        ))}
      </section>
    </div>
  );
}
