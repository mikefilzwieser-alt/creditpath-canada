"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";

type ParsedBureau = {
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
    balance?: number | string;
    credit_limit?: number | string;
    utilization?: number | string;
    payment_status?: string;
    action_recommended?: string;
  }>;
  collections?: Array<{
    creditor?: string;
    amount?: number | string;
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

function escapeHtml(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const r = 52;
  const stroke = 8;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, score / maxScore));
  const offset = c * (1 - pct);
  const track = "rgba(255,255,255,0.12)";

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden>
      <g transform="rotate(-90 80 80)">
        <circle cx="80" cy="80" r={r} fill="none" stroke={track} strokeWidth={stroke} />
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
  const { user, loading: authLoading, headingFontClass: h } = useDashboardAuth();
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("overview");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const { data, error: qErr } = await supabase
      .from("blueprints")
      .select("id, client_id, month_number, status, raw_parse_data, blueprint_data, created_at, updated_at")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) {
      setError(qErr.message);
      setBlueprint(null);
    } else {
      setBlueprint(data as BlueprintRow | null);
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
      Boolean(plan.this_months_focus));

  const rebuildScore = useMemo(() => {
    const r = plan?.rebuild_score;
    if (typeof r !== "number" || !Number.isFinite(r)) return 0;
    return Math.round(Math.min(100, Math.max(0, r)));
  }, [plan]);

  const rebuildScoreKnown = useMemo(() => {
    const r = plan?.rebuild_score;
    return typeof r === "number" && Number.isFinite(r);
  }, [plan]);

  const equifaxScore = useMemo(() => {
    const s = parsed?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s) ? Math.round(Math.min(850, Math.max(0, s))) : 0;
  }, [parsed]);

  const equifaxScoreKnown = useMemo(() => {
    const s = parsed?.score?.equifax_score;
    return typeof s === "number" && Number.isFinite(s);
  }, [parsed]);

  const factors = useMemo(() => normalizeScoreFactors(parsed?.score?.score_factors), [parsed]);

  const handleDownloadPdf = useCallback(() => {
    if (!blueprint || !parsed) return;

    const reportTitle = "Credit Path Canada - Credit Blueprint";
    const clientName = formatDisplay(parsed.personal?.name || user?.user_metadata?.full_name || user?.email || "Client");
    const monthNumber = blueprint.month_number;
    const primaryGoal = formatDisplay(user?.user_metadata?.primary_goal || "Not set");
    const rebuildScoreValue = rebuildScoreKnown ? String(rebuildScore) : "—";
    const rebuildScoreLabel = hasPlan ? formatDisplay(plan?.rebuild_score_label) : `Overall grade ${scoreToLetterGrade(equifaxScore)}`;
    const focusText = hasPlan ? formatDisplay(plan?.this_months_focus) : "Focus not available yet.";
    const topActions = hasPlan && Array.isArray(plan?.top_actions) ? plan.top_actions.slice(0, 5) : [];
    const summary = parsed.summary ?? {};
    const collectionRows = collections.slice(0, 8);

    const timelineRows = Array.from({ length: 24 }, (_, idx) => idx + 1)
      .map((month) => {
        if (month <= 3) return `<div class="month month-active">Mo ${month}</div>`;
        if (month <= 6) return `<div class="month month-coming">Mo ${month}<span class="month-tag">Coming Soon</span></div>`;
        return `<div class="month month-locked">Mo ${month}<span class="month-tag">Locked</span></div>`;
      })
      .join("");

    const actionsHtml =
      topActions.length === 0
        ? `<li>No priority actions available yet.</li>`
        : topActions
            .map((item) => `<li>${escapeHtml(formatDisplay(item.action))}</li>`)
            .join("");

    const collectionsHtml =
      collectionRows.length === 0
        ? `<li>No active collections were detected in this snapshot.</li>`
        : collectionRows
            .map((item) => {
              const creditor = escapeHtml(formatDisplay(item.creditor));
              const amount = escapeHtml(formatCurrency(item.amount));
              const recommendation = escapeHtml(formatDisplay(item.recommendation));
              return `<li><strong>${creditor}</strong> - ${amount}<br/><span>${recommendation}</span></li>`;
            })
            .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    @page { size: Letter; margin: 0.6in; }
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; margin: 0; color: #0F1923; }
    .page { min-height: 9.8in; display: flex; flex-direction: column; padding: 20px; border: 1px solid rgba(15,25,35,0.08); border-radius: 16px; }
    .page + .page { page-break-before: always; }
    .brand { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #00C9A7; padding-bottom: 10px; margin-bottom: 18px; }
    .brand h1 { margin: 0; font-size: 18px; }
    .brand p { margin: 0; font-size: 12px; color: rgba(15,25,35,0.65); }
    .footer { margin-top: auto; border-top: 1px solid rgba(15,25,35,0.15); padding-top: 10px; font-size: 11px; color: rgba(15,25,35,0.75); text-align: center; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { border: 1px solid rgba(15,25,35,0.12); border-radius: 12px; padding: 12px; background: #fff; }
    .focus { border: 2px solid #00C9A7; background: rgba(0,201,167,0.12); border-radius: 12px; padding: 14px; }
    h2 { margin: 0 0 10px; font-size: 20px; }
    h3 { margin: 0 0 8px; font-size: 15px; }
    ul, ol { margin: 8px 0 0; padding-left: 20px; }
    li { margin-bottom: 8px; line-height: 1.35; }
    .score { font-size: 40px; font-weight: 800; color: #00C9A7; line-height: 1; }
    .muted { color: rgba(15,25,35,0.68); font-size: 12px; }
    .timeline { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .month { border-radius: 10px; padding: 8px; border: 1px solid rgba(15,25,35,0.15); font-size: 12px; text-align: center; }
    .month-active { background: rgba(0,201,167,0.16); border-color: #00C9A7; font-weight: 700; }
    .month-coming { background: rgba(15,25,35,0.05); color: rgba(15,25,35,0.75); filter: blur(0.6px); }
    .month-locked { background: rgba(15,25,35,0.08); color: rgba(15,25,35,0.45); }
    .month-tag { display: block; font-size: 10px; margin-top: 2px; }
  </style>
</head>
<body>
  <section class="page">
    <div class="brand">
      <h1>Credit Path Canada</h1>
      <p>Month ${monthNumber} Blueprint</p>
    </div>
    <h2>Client Summary</h2>
    <div class="grid-2">
      <div class="card"><strong>Client</strong><br/>${escapeHtml(clientName)}</div>
      <div class="card"><strong>Primary Goal</strong><br/>${escapeHtml(primaryGoal)}</div>
      <div class="card"><strong>Month Number</strong><br/>${monthNumber}</div>
      <div class="card"><strong>Status</strong><br/>${escapeHtml(formatDisplay(blueprint.status))}</div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>Rebuild Score</h3>
      <div class="score">${escapeHtml(rebuildScoreValue)}</div>
      <div>${escapeHtml(rebuildScoreLabel)}</div>
    </div>
    <div class="footer">Credit Path Canada · Generated fresh from latest upload</div>
  </section>

  <section class="page">
    <div class="brand">
      <h1>Credit Path Canada</h1>
      <p>Page 2 · Focus & Actions</p>
    </div>
    <h2>This Month's Focus</h2>
    <div class="focus">${escapeHtml(focusText)}</div>
    <h2 style="margin-top:18px;">Top 5 Priority Actions</h2>
    <ol>${actionsHtml}</ol>
    <div class="footer">Credit Path Canada · Prioritized to maximize monthly score impact</div>
  </section>

  <section class="page">
    <div class="brand">
      <h1>Credit Path Canada</h1>
      <p>Page 3 · Bureau Health</p>
    </div>
    <h2>Bureau Health Snapshot</h2>
    <div class="grid-2">
      <div class="card"><strong>Utilization</strong><br/>${escapeHtml(formatPercent(summary.utilization_percentage))}</div>
      <div class="card"><strong>On-Time Payment Rate</strong><br/>${escapeHtml(formatPercent(summary.on_time_payment_percentage))}</div>
      <div class="card"><strong>Derogatory Marks</strong><br/>${escapeHtml(formatDisplay(summary.derogatory_marks))}</div>
      <div class="card"><strong>Hard Inquiries (12 mo)</strong><br/>${escapeHtml(formatDisplay(summary.hard_inquiries_12mo))}</div>
    </div>
    <p class="muted" style="margin-top:12px;">High-level summary only. Raw tradeline details are intentionally excluded.</p>
    <div class="footer">Credit Path Canada · Bureau health overview</div>
  </section>

  <section class="page">
    <div class="brand">
      <h1>Credit Path Canada</h1>
      <p>Page 4 · Collections</p>
    </div>
    <h2>Collections Overview</h2>
    <ul>${collectionsHtml}</ul>
    <p class="muted" style="margin-top:14px;">Recommendations are educational and should be reviewed with your advisor before action.</p>
    <div class="footer">Credit Path Canada · Collection strategy without tradeline-level disclosure</div>
  </section>

  <section class="page">
    <div class="brand">
      <h1>Credit Path Canada</h1>
      <p>Page 5 · 24-Month Timeline</p>
    </div>
    <h2>Program Timeline</h2>
    <p class="muted">Mo 1-3 active · Mo 4-6 coming soon · Mo 7-24 locked</p>
    <div class="timeline">${timelineRows}</div>
    <div class="footer">Credit Path Canada · Stay consistent month-to-month for best results</div>
  </section>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [
    blueprint,
    collections,
    equifaxScore,
    hasPlan,
    parsed,
    plan,
    rebuildScore,
    rebuildScoreKnown,
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
          Month {blueprint.month_number} · {blueprint.status}
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
            {hasPlan && plan?.this_months_focus ? (
              <section
                className="rounded-2xl border-2 px-6 py-5 shadow-sm"
                style={{
                  borderColor: TEAL,
                  backgroundColor: "rgba(0, 201, 167, 0.1)",
                  color: NAVY,
                }}
              >
                <p className={`text-xs font-bold uppercase tracking-wide ${h}`} style={{ color: TEAL }}>
                  This month&apos;s focus
                </p>
                <p className={`mt-2 text-lg font-semibold leading-snug ${h}`}>{plan.this_months_focus}</p>
              </section>
            ) : null}

            <section
              className="flex flex-col items-center gap-6 rounded-2xl px-6 py-10 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-10"
              style={{ backgroundColor: NAVY, color: "#fff" }}
            >
              <div className="relative flex shrink-0 items-center justify-center">
                {hasPlan ? (
                  <>
                    <ScoreRing score={rebuildScoreKnown ? rebuildScore : 0} maxScore={100} />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold tabular-nums ${h}`}>
                        {rebuildScoreKnown ? rebuildScore : "—"}
                      </span>
                      <span className="mt-1 text-xs uppercase tracking-wide text-white/60">Rebuild score</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ScoreRing score={equifaxScoreKnown ? equifaxScore : 0} maxScore={850} />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold tabular-nums ${h}`}>
                        {equifaxScoreKnown ? equifaxScore : "—"}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-white/60">Equifax score</span>
                    </div>
                  </>
                )}
              </div>
              <div className="max-w-md space-y-2 text-center sm:text-left">
                {hasPlan ? (
                  <>
                    <p className={`text-lg font-semibold ${h}`} style={{ color: TEAL }}>
                      {formatDisplay(plan?.rebuild_score_label)}
                    </p>
                    <p className="text-sm leading-relaxed text-white/85">{formatDisplay(plan?.score_summary)}</p>
                  </>
                ) : (
                  <>
                    <p className={`text-lg font-semibold ${h}`} style={{ color: TEAL }}>
                      Overall grade {equifaxScoreKnown ? scoreToLetterGrade(equifaxScore) : "—"}
                    </p>
                    <p className="text-sm text-white/75">
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

            <section className="space-y-4">
              <h2 className={`text-lg font-bold ${h}`} style={{ color: NAVY }}>
                Recommended Credit Products
              </h2>
              <div className="flex flex-col gap-4">
                {[
                  {
                    name: "Neo Financial",
                    description:
                      "Canada's top credit-building card. Reports to Equifax. Apply now.",
                    href: "https://neo.cc/refer/G3Y6L5A9",
                    cta: "Apply now",
                  },
                  {
                    name: "Tangerine",
                    description:
                      "Free bank account + credit card. Use code 79976711S1 for $50 bonus.",
                    href: "https://www.tangerine.ca/referral",
                    cta: "Get offer",
                  },
                  {
                    name: "Borrowell Credit Builder",
                    description: "Build credit history with small automated payments.",
                    href: "https://borrowell.com",
                    cta: "Learn more",
                  },
                ].map((product) => (
                  <div
                    key={product.name}
                    className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                    style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-base font-bold ${h}`} style={{ color: NAVY }}>
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#0F1923]/65">{product.description}</p>
                    </div>
                    <a
                      href={product.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-[#0F1923] transition-opacity hover:opacity-90"
                      style={{ backgroundColor: TEAL }}
                    >
                      {product.cta}
                    </a>
                  </div>
                ))}
              </div>
            </section>

            {hasPlan && Array.isArray(plan?.top_actions) && plan.top_actions.length > 0 ? (
              <section
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                style={{ borderColor: "rgba(15, 25, 35, 0.08)" }}
              >
                <h2 className={`text-lg font-bold ${h}`}>Top actions</h2>
                <ol className="mt-4 list-decimal space-y-4 pl-5 marker:font-bold marker:text-[#0F1923]">
                  {plan.top_actions.map((item, idx) => (
                    <li key={idx} className="pl-1 text-sm leading-relaxed">
                      <span className="font-semibold text-[#0F1923]">{formatDisplay(item.action)}</span>
                      {(item.impact || item.timeline) && (
                        <span className="mt-1 block text-[#0F1923]/70">
                          {[formatDisplay(item.impact), formatDisplay(item.timeline)].filter((x) => x !== "—").join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

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
                  {["Creditor", "Balance", "Utilization", "Payment status", "Recommended action"].map((col) => (
                    <th key={col} className={`whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide ${h}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tradelines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm opacity-60">
                      No tradelines in this report.
                    </td>
                  </tr>
                ) : (
                  tradelines.map((row, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3 font-medium">{formatDisplay(row.creditor_name)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDisplay(row.balance)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDisplay(row.utilization)}</td>
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
          <ul className="space-y-4">
            {collections.length === 0 ? (
              <li className="rounded-2xl border border-black/5 bg-white px-6 py-10 text-center text-sm opacity-60 shadow-sm">
                No collections reported.
              </li>
            ) : (
              collections.map((c, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-l-4 bg-white p-5 shadow-sm"
                  style={{ borderColor: "rgba(15, 25, 35, 0.08)", borderLeftColor: TEAL }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className={`text-base font-bold ${h}`}>{formatDisplay(c.creditor)}</h3>
                    <span className="text-lg font-semibold tabular-nums" style={{ color: TEAL }}>
                      {formatDisplay(c.amount)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed opacity-80">{formatDisplay(c.recommendation)}</p>
                </li>
              ))
            )}
          </ul>
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
