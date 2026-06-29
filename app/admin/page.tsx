"use client";

import { Montserrat } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeAppliedPromoCode } from "@/lib/dashboard-access";
import { supabase } from "@/lib/supabase";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700"] });

const NAVY = "#0F1923";
const TEAL = "#00C9A7";
const ACCESS_BADGE_LIFETIME_PURPLE = "#7c3aed";
const ACCESS_BADGE_ACTIVE_GREEN = "#16a34a";
const ACCESS_BADGE_TRIAL_GRAY_BG = "#e5e7eb";
const ACCESS_BADGE_TRIAL_GRAY_TEXT = "#374151";
const BG = "#F5F7FA";
const PROGRESS_TRACK = "#E8EBEF";
const PROGRESS_TO_90_MS = 25_000;

const PRIMARY_GOALS = [
  "Get Approved for Auto Loan",
  "Refinance at a Lower Rate",
  "Mortgage Readiness",
  "Increase My Credit Score",
  "Build Business Credit",
  "Emergency Line of Credit",
] as const;

const VA_NAMES = ["Eli", "Eliza", "Bev", "Mico", "Michael"] as const;

const VA_SESSION_KEY = "creditpath_va_admin_session";

/** Must match `VA_PORTAL_DEFAULT_PASSWORD` in `@/lib/va-portal` (last character is `!` U+0021). */
const VA_PORTAL_PASSWORD_LITERAL = "Autocredit007!";

/** North American display: (604) → (604)444 → (604)444-4444 as digits are entered (matches onboarding). */
function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 3) return `(${d}`;
  if (d.length === 3) return `(${d})`;
  if (d.length <= 6) return `(${d.slice(0, 3)})${d.slice(3)}`;
  return `(${d.slice(0, 3)})${d.slice(3, 6)}-${d.slice(6)}`;
}

function parsePhoneDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, 10);
}

type TabId = "create" | "clients" | "reporting";

type FounderSummary = {
  active_total: number;
  mrr: number;
  trial_total: number;
  signups_week: number;
  signups_month: number;
  cancelled_month: number;
  promo_usage: number;
};

type OpsReportRow = {
  id: string;
  full_name: string | null;
  assigned_va: string | null;
  subscription_status: string | null;
  applied_promo_code?: string | null;
  current_month: number | null;
  last_bureau_at: string | null;
  last_login_at: string | null;
  blueprint_generated: boolean;
  actions_completed_this_month: number;
  stuck_month1: boolean;
};

type OpsAccessFilterId = "active" | "trial" | "lifetime" | "first_nations" | "other";

function opsRowAccessFilterId(row: OpsReportRow): OpsAccessFilterId {
  const promoNorm = normalizeAppliedPromoCode(row.applied_promo_code);
  if (promoNorm === "FIRSTNATIONS") return "first_nations";
  if (promoNorm === "CCVIP2026") return "lifetime";
  const sub = (row.subscription_status ?? "").trim().toLowerCase();
  if (sub === "active") return "active";
  if (sub === "trial") return "trial";
  return "other";
}

function OpsAccessTypeBadge({ row }: { row: OpsReportRow }) {
  const promoNorm = normalizeAppliedPromoCode(row.applied_promo_code);
  const sub = (row.subscription_status ?? "").trim().toLowerCase();

  if (promoNorm === "FIRSTNATIONS") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#0F1923]"
        style={{ backgroundColor: TEAL }}
      >
        🍁 First Nations
      </span>
    );
  }
  if (promoNorm === "CCVIP2026") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
        style={{ backgroundColor: ACCESS_BADGE_LIFETIME_PURPLE }}
      >
        🎟️ Lifetime
      </span>
    );
  }
  if (sub === "active") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
        style={{ backgroundColor: ACCESS_BADGE_ACTIVE_GREEN }}
      >
        ✅ Active
      </span>
    );
  }
  if (sub === "trial") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: ACCESS_BADGE_TRIAL_GRAY_BG, color: ACCESS_BADGE_TRIAL_GRAY_TEXT }}
      >
        🔄 Trial
      </span>
    );
  }
  return <span className="text-xs opacity-50">—</span>;
}

type OpsSortKey =
  | "client"
  | "currentMonth"
  | "lastBureau"
  | "lastLogin"
  | "blueprint"
  | "actionsMo"
  | "stuck"
  | "subscription";

/** Nulls last; `asc` true = ascending comparison for non-null values. */
function compareOpsReportRows(a: OpsReportRow, b: OpsReportRow, key: OpsSortKey, asc: boolean): number {
  const mul = asc ? 1 : -1;
  switch (key) {
    case "client": {
      const sa = (a.full_name ?? "").toLowerCase();
      const sb = (b.full_name ?? "").toLowerCase();
      return mul * sa.localeCompare(sb);
    }
    case "currentMonth": {
      if (a.current_month == null && b.current_month == null) return 0;
      if (a.current_month == null) return 1;
      if (b.current_month == null) return -1;
      return mul * (a.current_month - b.current_month);
    }
    case "lastBureau": {
      const va = a.last_bureau_at ? Date.parse(a.last_bureau_at) : null;
      const vb = b.last_bureau_at ? Date.parse(b.last_bureau_at) : null;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return mul * (va - vb);
    }
    case "lastLogin": {
      const va = a.last_login_at ? Date.parse(a.last_login_at) : null;
      const vb = b.last_login_at ? Date.parse(b.last_login_at) : null;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return mul * (va - vb);
    }
    case "blueprint": {
      const na = a.blueprint_generated ? 1 : 0;
      const nb = b.blueprint_generated ? 1 : 0;
      return mul * (na - nb);
    }
    case "actionsMo":
      return mul * (a.actions_completed_this_month - b.actions_completed_this_month);
    case "stuck": {
      const na = a.stuck_month1 ? 1 : 0;
      const nb = b.stuck_month1 ? 1 : 0;
      return mul * (na - nb);
    }
    case "subscription": {
      const sa = (a.subscription_status ?? "").toLowerCase();
      const sb = (b.subscription_status ?? "").toLowerCase();
      return mul * sa.localeCompare(sb);
    }
    default:
      return 0;
  }
}

function reportingMineIdentifierStrings(vaFilter: string, authEmail: string | null, authFullName: string | null): string[] {
  const set = new Set<string>();
  const add = (s: string | null | undefined) => {
    const t = (s ?? "").trim().toLowerCase();
    if (!t) return;
    set.add(t);
    const at = t.indexOf("@");
    if (at > 0) set.add(t.slice(0, at));
  };
  add(vaFilter);
  add(authEmail);
  add(authFullName);
  if (authFullName?.trim()) {
    const first = authFullName.trim().split(/\s+/)[0];
    if (first) add(first);
  }
  return [...set];
}

function opsRowMatchesMineAssignedVa(row: OpsReportRow, identifiers: string[]): boolean {
  const av = (row.assigned_va ?? "").trim().toLowerCase();
  if (!av) return false;
  return identifiers.includes(av);
}

const VA_OPS_TABLE_COLUMNS: Array<{ sortKey: OpsSortKey | null; label: string; className: string }> = [
  { sortKey: "client", label: "Client", className: "py-3 pl-4 pr-3" },
  { sortKey: null, label: "Access Type", className: "py-3 pr-3 whitespace-nowrap normal-case tracking-normal" },
  { sortKey: "currentMonth", label: "Current month", className: "py-3 pr-3" },
  { sortKey: "lastBureau", label: "Last bureau upload", className: "py-3 pr-3" },
  { sortKey: "lastLogin", label: "Last login", className: "py-3 pr-3" },
  { sortKey: "blueprint", label: "Blueprint", className: "py-3 pr-3" },
  { sortKey: "actionsMo", label: "Actions (mo)", className: "py-3 pr-3" },
  { sortKey: "stuck", label: "Stuck", className: "py-3 pr-3" },
  { sortKey: "subscription", label: "Subscription", className: "py-3 pr-4" },
];

type ListRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  primary_goal: string | null;
  assigned_va: string | null;
  client_created_at: string | null;
  free_trial: boolean;
  subscription_status: string | null;
  goals: unknown;
  blueprint_id: string | null;
  blueprint_status: string;
  blueprint_created_at: string | null;
  bureau_uploaded_at: string | null;
  current_month: number | null;
  readiness_percentage: number | null;
  auto_ready_alert: boolean;
  equifax_score: number | null;
  rebuild_score: number;
  utilization_percentage: number | null;
  top_actions_count: number;
  actions_completed: number;
  current_month_actions_completed: number;
  last_activity: string | null;
  stale_bureau: boolean;
  graduation_ready: boolean;
  stalled_status: "not_started" | "partial" | null;
};

type ListSummary = {
  active_clients: number;
  trial_clients: number;
  cancelled_clients: number;
  stale_bureau_count: number;
  graduation_ready_count: number;
};

type ClientSortKey =
  | "name"
  | "email"
  | "phone"
  | "subscription"
  | "currentMonth"
  | "equifax"
  | "readiness"
  | "lastActivity"
  | "stalled"
  | "staleBureau"
  | "graduationReady"
  | "actions";

const CLIENT_TABLE_COLUMNS: Array<{ sortKey: ClientSortKey; label: string; className: string }> = [
  { sortKey: "name", label: "Name", className: "py-3 pr-3" },
  { sortKey: "email", label: "Email", className: "py-3 pr-3" },
  { sortKey: "phone", label: "Phone", className: "py-3 pr-3" },
  { sortKey: "subscription", label: "Subscription", className: "py-3 pr-3" },
  { sortKey: "currentMonth", label: "Month", className: "py-3 pr-3" },
  { sortKey: "equifax", label: "Score", className: "py-3 pr-3" },
  { sortKey: "readiness", label: "Readiness", className: "py-3 pr-3" },
  { sortKey: "lastActivity", label: "Last activity", className: "py-3 pr-3" },
  { sortKey: "stalled", label: "Stalled", className: "py-3 pr-3" },
  { sortKey: "staleBureau", label: "Stale bureau", className: "py-3 pr-3" },
  { sortKey: "graduationReady", label: "Grad ready", className: "py-3 pr-3" },
  { sortKey: "actions", label: "Actions", className: "py-3 pr-3" },
];

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined, asc: boolean): number {
  const mul = asc ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return mul * (a - b);
}

function compareNullableDate(a: string | null | undefined, b: string | null | undefined, asc: boolean): number {
  const av = a ? Date.parse(a) : null;
  const bv = b ? Date.parse(b) : null;
  return compareNullableNumber(Number.isFinite(av) ? av : null, Number.isFinite(bv) ? bv : null, asc);
}

function phoneTelHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? `tel:${digits}` : null;
}

function compareClientRows(a: ListRow, b: ListRow, key: ClientSortKey, asc: boolean): number {
  const mul = asc ? 1 : -1;
  switch (key) {
    case "name":
      return mul * (a.full_name ?? "").toLowerCase().localeCompare((b.full_name ?? "").toLowerCase());
    case "email":
      return mul * (a.email ?? "").toLowerCase().localeCompare((b.email ?? "").toLowerCase());
    case "phone":
      return mul * (a.phone ?? "").localeCompare(b.phone ?? "");
    case "subscription":
      return mul * (a.subscription_status ?? "").toLowerCase().localeCompare((b.subscription_status ?? "").toLowerCase());
    case "currentMonth":
      return compareNullableNumber(a.current_month, b.current_month, asc);
    case "equifax":
      return compareNullableNumber(a.equifax_score, b.equifax_score, asc);
    case "readiness":
      return compareNullableNumber(a.readiness_percentage, b.readiness_percentage, asc);
    case "lastActivity":
      return compareNullableDate(a.last_activity, b.last_activity, asc);
    case "stalled": {
      const order = { not_started: 2, partial: 1 } satisfies Record<NonNullable<ListRow["stalled_status"]>, number>;
      const aRank = a.stalled_status ? order[a.stalled_status] : 0;
      const bRank = b.stalled_status ? order[b.stalled_status] : 0;
      return mul * (aRank - bRank);
    }
    case "staleBureau":
      return mul * (Number(a.stale_bureau) - Number(b.stale_bureau));
    case "graduationReady":
      return mul * (Number(a.graduation_ready) - Number(b.graduation_ready));
    case "actions":
      return mul * (a.actions_completed - b.actions_completed);
    default:
      return 0;
  }
}

export default function VaAdminPage() {
  const h = montserrat.className;
  const [unlocked, setUnlocked] = useState(false);
  const [portalPassword, setPortalPassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [tab, setTab] = useState<TabId>("create");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  /** Raw 10-digit string only (no formatting); same model as onboarding. */
  const [phoneDigits, setPhoneDigits] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState<string>(PRIMARY_GOALS[0]);
  const [assignedVa, setAssignedVa] = useState<string>(VA_NAMES[0]);
  const [freeTrial, setFreeTrial] = useState(true);
  const [pdf, setPdf] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState("Creating account...");
  const completionModeRef = useRef<"idle" | "error" | "success">("idle");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{
    client_name: string;
    temporary_password: string;
    welcome_email_sent: boolean;
    welcome_email_error: string | null;
  } | null>(null);

  const [listVaFilter, setListVaFilter] = useState<string>("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [listRows, setListRows] = useState<ListRow[]>([]);
  const [listSummary, setListSummary] = useState<ListSummary | null>(null);
  const [selectedClient, setSelectedClient] = useState<ListRow | null>(null);
  const [clientSubscriptionFilter, setClientSubscriptionFilter] = useState<"all" | "active" | "trial" | "cancelled" | "inactive">("all");
  const [clientStaleFilter, setClientStaleFilter] = useState<"all" | "stale" | "fresh">("all");
  const [clientGraduationFilter, setClientGraduationFilter] = useState<"all" | "ready" | "not_ready">("all");
  const [clientStalledFilter, setClientStalledFilter] = useState<"all" | "not_started" | "partial">("all");
  const [clientSortKey, setClientSortKey] = useState<ClientSortKey | null>(null);
  const [clientSortDir, setClientSortDir] = useState<"asc" | "desc">("asc");

  const [reportingLoading, setReportingLoading] = useState(false);
  const [reportingError, setReportingError] = useState("");
  const [founderSummary, setFounderSummary] = useState<FounderSummary | null>(null);
  const [opsReportRows, setOpsReportRows] = useState<OpsReportRow[]>([]);
  const [reportingOpsScope, setReportingOpsScope] = useState<"all" | "mine">("all");
  const [reportingAuthEmail, setReportingAuthEmail] = useState<string | null>(null);
  const [reportingAuthName, setReportingAuthName] = useState<string | null>(null);
  const [reportingOpsAccessFilter, setReportingOpsAccessFilter] = useState<
    "all" | "active" | "trial" | "lifetime" | "first_nations"
  >("all");
  const [opsSortKey, setOpsSortKey] = useState<OpsSortKey | null>(null);
  const [opsSortDir, setOpsSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(VA_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { portal_password?: string };
      const pwd =
        typeof parsed.portal_password === "string" ? parsed.portal_password.trim() : "";
      if (!pwd) return;
      setPortalPassword(pwd);
      void (async () => {
        const res = await fetch("/api/admin/va-list-clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portal_password: pwd, assigned_va: null }),
        });
        if (res.ok) setUnlocked(true);
        else sessionStorage.removeItem(VA_SESSION_KEY);
      })();
    } catch {
      sessionStorage.removeItem(VA_SESSION_KEY);
    }
  }, []);

  const unlock = useCallback(async () => {
    setGateError("");
    const trimmed = portalPassword.trim();
    if (!trimmed) {
      setGateError("Enter the portal password.");
      return;
    }

    console.log("[VA Admin gate] entered password (raw):", portalPassword);
    console.log("[VA Admin gate] entered password (trimmed, JSON):", JSON.stringify(trimmed));
    console.log("[VA Admin gate] expected literal (JSON):", JSON.stringify(VA_PORTAL_PASSWORD_LITERAL));
    console.log(
      "[VA Admin gate] last char code (should be 33 for !):",
      trimmed.length ? trimmed.charCodeAt(trimmed.length - 1) : null,
    );

    try {
      const res = await fetch("/api/admin/va-list-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_password: trimmed, assigned_va: null }),
      });
      if (res.status === 401) {
        setGateError("Incorrect password.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setGateError(data.error ?? "Could not verify portal.");
        return;
      }
      setPortalPassword(trimmed);
      sessionStorage.setItem(VA_SESSION_KEY, JSON.stringify({ portal_password: trimmed }));
      setUnlocked(true);
    } catch {
      setGateError("Network error.");
    }
  }, [portalPassword]);

  const loadReporting = useCallback(async () => {
    if (!unlocked || !portalPassword) return;
    setReportingLoading(true);
    setReportingError("");
    try {
      const res = await fetch("/api/admin/va-reporting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_password: portalPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        founder?: FounderSummary;
        ops?: OpsReportRow[];
        error?: string;
      };
      if (!res.ok) {
        setReportingError(data.error ?? "Failed to load reporting.");
        setFounderSummary(null);
        setOpsReportRows([]);
        return;
      }
      setFounderSummary(data.founder ?? null);
      setOpsReportRows(data.ops ?? []);
    } catch {
      setReportingError("Network error.");
      setFounderSummary(null);
      setOpsReportRows([]);
    } finally {
      setReportingLoading(false);
    }
  }, [portalPassword, unlocked]);

  const loadClients = useCallback(async () => {
    if (!unlocked || !portalPassword) return;
    setListLoading(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/va-list-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portal_password: portalPassword,
          assigned_va: listVaFilter || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        summary?: ListSummary;
        clients?: ListRow[];
        error?: string;
      };
      if (!res.ok) {
        setListError(data.error ?? "Failed to load clients.");
        setListRows([]);
        setListSummary(null);
        return;
      }
      setListSummary(data.summary ?? null);
      setListRows(data.clients ?? []);
    } catch {
      setListError("Network error.");
      setListRows([]);
      setListSummary(null);
    } finally {
      setListLoading(false);
    }
  }, [listVaFilter, portalPassword, unlocked]);

  const onTabClients = useCallback(() => {
    setTab("clients");
    setSelectedClient(null);
  }, []);

  useEffect(() => {
    if (!unlocked || tab !== "clients") return;
    void loadClients();
  }, [listVaFilter, unlocked, tab, loadClients]);

  useEffect(() => {
    if (!unlocked || tab !== "reporting") return;
    void loadReporting();
  }, [unlocked, tab, loadReporting]);

  useEffect(() => {
    if (!unlocked) {
      setReportingAuthEmail(null);
      setReportingAuthName(null);
      return;
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      const em = user?.email?.trim();
      setReportingAuthEmail(em ? em : null);
      const md = user?.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
      const fn =
        typeof md?.full_name === "string"
          ? md.full_name.trim()
          : typeof md?.name === "string"
            ? md.name.trim()
            : "";
      setReportingAuthName(fn ? fn : null);
    });
    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  const reportingDisplayedOpsRows = useMemo(() => {
    let rows: OpsReportRow[];
    if (reportingOpsScope !== "mine") {
      rows = opsReportRows;
    } else {
      const ids = reportingMineIdentifierStrings(listVaFilter, reportingAuthEmail, reportingAuthName);
      if (ids.length === 0) rows = [];
      else rows = opsReportRows.filter((row) => opsRowMatchesMineAssignedVa(row, ids));
    }
    if (reportingOpsAccessFilter !== "all") {
      rows = rows.filter((row) => opsRowAccessFilterId(row) === reportingOpsAccessFilter);
    }
    if (opsSortKey == null) return rows;
    const asc = opsSortDir === "asc";
    return [...rows].sort((a, b) => compareOpsReportRows(a, b, opsSortKey, asc));
  }, [
    reportingOpsScope,
    opsReportRows,
    listVaFilter,
    reportingAuthEmail,
    reportingAuthName,
    reportingOpsAccessFilter,
    opsSortKey,
    opsSortDir,
  ]);

  const displayedClientRows = useMemo(() => {
    let rows = listRows;
    if (clientSubscriptionFilter !== "all") {
      rows = rows.filter((row) => (row.subscription_status ?? "").trim().toLowerCase() === clientSubscriptionFilter);
    }
    if (clientStaleFilter !== "all") {
      rows = rows.filter((row) => (clientStaleFilter === "stale" ? row.stale_bureau : !row.stale_bureau));
    }
    if (clientGraduationFilter !== "all") {
      rows = rows.filter((row) => (clientGraduationFilter === "ready" ? row.graduation_ready : !row.graduation_ready));
    }
    if (clientStalledFilter !== "all") {
      rows = rows.filter((row) => row.stalled_status === clientStalledFilter);
    }
    if (clientSortKey == null) return rows;
    return [...rows].sort((a, b) => compareClientRows(a, b, clientSortKey, clientSortDir === "asc"));
  }, [
    listRows,
    clientSubscriptionFilter,
    clientStaleFilter,
    clientGraduationFilter,
    clientStalledFilter,
    clientSortKey,
    clientSortDir,
  ]);

  const onOpsSortHeaderClick = useCallback((key: OpsSortKey) => {
    setOpsSortKey((prev) => {
      if (prev !== key) {
        setOpsSortDir("asc");
        return key;
      }
      setOpsSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  }, []);

  const onClientSortHeaderClick = useCallback((key: ClientSortKey) => {
    setClientSortKey((prev) => {
      if (prev !== key) {
        setClientSortDir("asc");
        return key;
      }
      setClientSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  }, []);

  useEffect(() => {
    setSelectedClient(null);
  }, [listVaFilter]);

  useEffect(() => {
    if (!submitting) return;
    const start = Date.now();
    completionModeRef.current = "idle";
    const id = window.setInterval(() => {
      if (completionModeRef.current === "error") return;
      if (completionModeRef.current === "success") {
        setProgressPercent(100);
        return;
      }
      const elapsed = Date.now() - start;
      setProgressPercent(Math.min(90, (elapsed / PROGRESS_TO_90_MS) * 90));
      if (elapsed < 5000) setProgressStatus("Creating account...");
      else if (elapsed < 12_000) setProgressStatus("Uploading bureau...");
      else if (elapsed < 30_000) setProgressStatus("Generating blueprint...");
      else setProgressStatus("Almost done...");
    }, 50);
    return () => window.clearInterval(id);
  }, [submitting]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlocked || !portalPassword) return;
    setSubmitError("");
    setSuccess(null);
    if (!pdf) {
      setSubmitError("Upload the Equifax bureau PDF.");
      return;
    }
    if (phoneDigits.length !== 10) {
      setSubmitError("Enter a 10-digit phone number.");
      return;
    }
    completionModeRef.current = "idle";
    setProgressPercent(0);
    setProgressStatus("Creating account...");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("portal_password", portalPassword);
      fd.set("full_name", fullName.trim());
      fd.set("email", email.trim());
      fd.set("phone", phoneDigits);
      fd.set("primary_goal", primaryGoal);
      fd.set("assigned_va", assignedVa);
      fd.set("free_trial", freeTrial ? "true" : "false");
      fd.set("pdf", pdf);

      const res = await fetch("/api/admin/va-create-client", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        client_name?: string;
        temporary_password?: string;
        welcome_email_sent?: boolean;
        welcome_email_error?: string | null;
      };
      if (!res.ok) {
        completionModeRef.current = "error";
        setSubmitError(data.error ?? "Create failed.");
        return;
      }
      completionModeRef.current = "success";
      setProgressPercent(100);
      await new Promise((r) => window.setTimeout(r, 200));
      setSuccess({
        client_name: data.client_name ?? fullName.trim(),
        temporary_password: data.temporary_password ?? "",
        welcome_email_sent: Boolean(data.welcome_email_sent),
        welcome_email_error: data.welcome_email_error ?? null,
      });
      setFullName("");
      setEmail("");
      setPhoneDigits("");
      setPdf(null);
    } catch {
      completionModeRef.current = "error";
      setSubmitError("Network error.");
    } finally {
      completionModeRef.current = "idle";
      setSubmitting(false);
    }
  };

  const formatDate = useMemo(
    () => (iso: string | null) => {
      if (!iso) return "—";
      try {
        return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
      } catch {
        return "—";
      }
    },
    [],
  );

  const daysSinceIso = useCallback((iso: string | null) => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  }, []);

  const formatGoals = useCallback((g: unknown) => {
    if (g == null) return "—";
    if (Array.isArray(g)) return g.map(String).filter(Boolean).join(", ") || "—";
    if (typeof g === "string") return g || "—";
    return "—";
  }, []);

  if (!unlocked) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${h}`} style={{ backgroundColor: BG, color: NAVY }}>
        <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-8 shadow-lg" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
            Credit Path Canada
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
            VA portal
          </h1>
          <p className="mt-2 text-sm leading-relaxed opacity-75">
            Virtual assistants: sign in with the team password. There is no self-serve signup — this page is for internal use only.
          </p>
          <input
            type="password"
            value={portalPassword}
            onChange={(e) => setPortalPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void unlock();
            }}
            className="mt-5 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-offset-0"
            style={{ color: NAVY, caretColor: TEAL, ["--tw-ring-color" as string]: TEAL }}
            autoComplete="off"
            placeholder="Portal password"
          />
          {gateError ? <p className="mt-2 text-sm text-red-600">{gateError}</p> : null}
          <button
            type="button"
            onClick={() => void unlock()}
            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-[#0F1923]"
            style={{ backgroundColor: TEAL }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-8 sm:px-8 ${h}`} style={{ backgroundColor: BG, color: NAVY }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
              VA Admin Portal
            </h1>
            <p className="mt-1 text-sm opacity-70">Create clients and view assignments.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(VA_SESSION_KEY);
              setUnlocked(false);
              setPortalPassword("");
              setSuccess(null);
              setSelectedClient(null);
            }}
            className="self-start rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            Lock portal
          </button>
        </header>

        <div className="flex gap-2 border-b border-black/10 pb-1" role="tablist">
          {(
            [
              { id: "create" as const, label: "Create Client" },
              { id: "clients" as const, label: "My Clients" },
              { id: "reporting" as const, label: "Reporting" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                if (t.id === "clients") onTabClients();
                else setTab(t.id);
              }}
              className="rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                color: tab === t.id ? NAVY : "rgba(15,25,35,0.55)",
                borderBottom: tab === t.id ? `3px solid ${TEAL}` : "3px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "reporting" ? (
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-bold">Founder summary</h2>
              <p className="mt-1 text-sm opacity-70">Live counts from the clients table (MRR assumes $17.76 per active client).</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reportingLoading && !founderSummary ? (
                  <p className="col-span-full text-sm opacity-70">Loading summary…</p>
                ) : founderSummary ? (
                  <>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Active clients</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {founderSummary.active_total}
                      </p>
                      <p className="mt-1 text-xs opacity-70">subscription_status = active</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">MRR (est.)</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        ${founderSummary.mrr.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="mt-1 text-xs opacity-70">MRR (est.) — Active × $17.76/mo</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Trial clients</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {founderSummary.trial_total}
                      </p>
                      <p className="mt-1 text-xs opacity-70">free_trial = true</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">New signups (this week)</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {founderSummary.signups_week}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">New signups (this month)</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {founderSummary.signups_month}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Cancelled (this month)</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {founderSummary.cancelled_month}
                      </p>
                      <p className="mt-1 text-xs opacity-70">Status cancelled, client row updated this month</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-3" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Promo code usage</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {founderSummary.promo_usage}
                      </p>
                      <p className="mt-1 text-xs opacity-70">Clients with applied_promo_code set</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm opacity-70">No summary data.</p>
                )}
              </div>
            </section>

            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-lg font-bold">VA ops</h2>
                <button
                  type="button"
                  onClick={() => void loadReporting()}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0F1923]"
                  style={{ backgroundColor: TEAL }}
                >
                  Refresh
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReportingOpsScope("all")}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: reportingOpsScope === "all" ? TEAL : "#fff",
                    color: reportingOpsScope === "all" ? NAVY : "rgba(15,25,35,0.65)",
                    border: `1px solid ${reportingOpsScope === "all" ? TEAL : "rgba(15,25,35,0.12)"}`,
                  }}
                >
                  All Clients
                </button>
                <button
                  type="button"
                  onClick={() => setReportingOpsScope("mine")}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: reportingOpsScope === "mine" ? TEAL : "#fff",
                    color: reportingOpsScope === "mine" ? NAVY : "rgba(15,25,35,0.65)",
                    border: `1px solid ${reportingOpsScope === "mine" ? TEAL : "rgba(15,25,35,0.12)"}`,
                  }}
                >
                  My Clients
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                  <span>Access Type</span>
                  <select
                    value={reportingOpsAccessFilter}
                    onChange={(e) =>
                      setReportingOpsAccessFilter(
                        e.target.value as "all" | "active" | "trial" | "lifetime" | "first_nations",
                      )
                    }
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none"
                    style={{ color: NAVY }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="lifetime">Lifetime</option>
                    <option value="first_nations">First Nations</option>
                  </select>
                </label>
              </div>
              {reportingError ? <p className="mt-2 text-sm text-red-600">{reportingError}</p> : null}
              {reportingLoading ? (
                <p className="mt-4 text-sm opacity-70">Loading…</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                  <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-xs font-semibold uppercase tracking-wide opacity-60">
                        {VA_OPS_TABLE_COLUMNS.map((col) => {
                          if (col.sortKey == null) {
                            return (
                              <th key={col.label} scope="col" className={col.className}>
                                <span className="opacity-100">{col.label}</span>
                              </th>
                            );
                          }
                          const sortKey = col.sortKey;
                          const active = opsSortKey === sortKey;
                          return (
                            <th
                              key={sortKey}
                              scope="col"
                              className={col.className}
                              aria-sort={active ? (opsSortDir === "asc" ? "ascending" : "descending") : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => onOpsSortHeaderClick(sortKey)}
                                className="inline-flex max-w-full items-baseline gap-0.5 text-left uppercase tracking-wide opacity-100 transition-opacity hover:opacity-80"
                              >
                                <span className="min-w-0 break-words">{col.label}</span>
                                {active ? (
                                  <span className="shrink-0 tabular-nums" aria-hidden>
                                    {opsSortDir === "asc" ? "↑" : "↓"}
                                  </span>
                                ) : null}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {reportingDisplayedOpsRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 pl-4 text-center opacity-60">
                            No clients.
                          </td>
                        </tr>
                      ) : (
                        reportingDisplayedOpsRows.map((row) => {
                          const bureauDays = daysSinceIso(row.last_bureau_at);
                          const loginDays = daysSinceIso(row.last_login_at);
                          const bureauStale = bureauDays !== null && bureauDays >= 90;
                          const loginStale = row.last_login_at == null || (loginDays !== null && loginDays >= 30);
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-black/5"
                              style={
                                row.stuck_month1
                                  ? { backgroundColor: "rgba(245, 197, 24, 0.18)", boxShadow: "inset 0 0 0 1px rgba(245,158,11,0.5)" }
                                  : undefined
                              }
                            >
                              <td className="py-3 pl-4 pr-3 font-semibold">{row.full_name ?? "—"}</td>
                              <td className="py-3 pr-3">
                                <OpsAccessTypeBadge row={row} />
                              </td>
                              <td className="py-3 pr-3 tabular-nums">{row.current_month ?? "—"}</td>
                              <td
                                className="py-3 pr-3 whitespace-nowrap"
                                style={bureauStale ? { color: "#b91c1c", fontWeight: 700 } : undefined}
                              >
                                {row.last_bureau_at ? formatDate(row.last_bureau_at) : "—"}
                                {bureauStale ? " · 90d+" : ""}
                              </td>
                              <td
                                className="py-3 pr-3 whitespace-nowrap"
                                style={loginStale ? { color: "#a16207", fontWeight: 700 } : undefined}
                              >
                                {row.last_login_at ? formatDate(row.last_login_at) : "Never"}
                                {loginStale && row.last_login_at ? " · 30d+" : ""}
                                {loginStale && !row.last_login_at ? " · follow up" : ""}
                              </td>
                              <td className="py-3 pr-3">{row.blueprint_generated ? "Yes" : "No"}</td>
                              <td className="py-3 pr-3 tabular-nums">{row.actions_completed_this_month}</td>
                              <td className="py-3 pr-3 font-semibold" style={{ color: row.stuck_month1 ? "#b45309" : "rgba(15,25,35,0.35)" }}>
                                {row.stuck_month1 ? "Month 1 · 45d+" : "—"}
                              </td>
                              <td className="py-3 pr-4">{row.subscription_status ?? "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : tab === "create" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <form
              onSubmit={handleCreateSubmit}
              className="space-y-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              style={{ borderColor: "rgba(15,25,35,0.08)" }}
            >
              <h2 className="text-lg font-bold">Create Client</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Full name</span>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ color: NAVY }}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ color: NAVY }}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Phone</span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChange={(e) => setPhoneDigits(parsePhoneDigits(e.target.value))}
                    placeholder="(555)555-5555"
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ color: NAVY }}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Primary goal</span>
                  <select
                    required
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ color: NAVY }}
                  >
                    {PRIMARY_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Assigned VA</span>
                  <select
                    required
                    value={assignedVa}
                    onChange={(e) => setAssignedVa(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ color: NAVY }}
                  >
                    {VA_NAMES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={freeTrial} onChange={(e) => setFreeTrial(e.target.checked)} className="size-4 rounded border" />
                    <span className="text-sm font-semibold">Free trial</span>
                  </label>
                  <p className="mt-2 text-xs leading-relaxed opacity-70">
                    New clients are created with trial status and a trial start time. They must complete the pricing page (Stripe checkout) before the dashboard until payment info is on file.
                  </p>
                </div>
                <div
                  className="block rounded-xl border-2 p-4 shadow-sm sm:col-span-2"
                  style={{ borderColor: TEAL, backgroundColor: "rgba(0, 201, 167, 0.08)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TEAL }}>
                    Upload EQ bureau (required)
                  </p>
                  <p className="mt-1 text-xs leading-relaxed opacity-75">
                    Attach the client&apos;s Equifax PDF export here before creating the account.
                  </p>
                  <label className="mt-3 block cursor-pointer">
                    <span className="sr-only">Equifax bureau PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
                      style={{ color: NAVY }}
                    />
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl px-6 py-3 text-sm font-semibold text-[#0F1923] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {submitting ? "Creating client..." : "Create client & run blueprint"}
              </button>
              {submitting ? (
                <div className="mt-4 space-y-2">
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: PROGRESS_TRACK }}
                    role="progressbar"
                    aria-valuenow={Math.round(progressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: TEAL,
                      }}
                    />
                  </div>
                  <p className="text-sm opacity-80">{progressStatus}</p>
                </div>
              ) : null}
              {submitError && !submitting ? (
                <p className="mt-3 text-sm text-red-600">{submitError}</p>
              ) : null}
            </form>

            <div className="space-y-4">
              {success ? (
                <div
                  className="rounded-2xl border-2 p-5 shadow-sm"
                  style={{ borderColor: TEAL, backgroundColor: "rgba(0,201,167,0.12)" }}
                >
                  <p className="text-sm font-bold" style={{ color: TEAL }}>
                    Success
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">
                    <strong>{success.client_name}</strong> is set up. Temporary password:{" "}
                    <strong className="tabular-nums">{success.temporary_password}</strong>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">
                    Text the client their password. Login:{" "}
                    <a href="https://creditpathcanada.ca/login" className="font-semibold underline" style={{ color: NAVY }}>
                      creditpathcanada.ca/login
                    </a>
                  </p>
                  <p className="mt-2 text-xs opacity-80">
                    Welcome email (Resend):{" "}
                    {success.welcome_email_sent ? (
                      <span className="font-semibold text-green-700">Sent</span>
                    ) : (
                      <span className="text-amber-800">Not sent — {success.welcome_email_error ?? "check RESEND_API_KEY"}</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-black/5 bg-white p-5 text-sm leading-relaxed opacity-70 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                  After submit, the client&apos;s temp password appears here (format <code className="font-mono">CPC</code> + last 4 digits of
                  phone).
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_min(380px,100%)] lg:items-start">
            <div className="relative space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-lg font-bold">My Clients</h2>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm">
                    <span className="block text-xs font-semibold uppercase tracking-wide opacity-60">Filter by VA</span>
                    <select
                      value={listVaFilter}
                      onChange={(e) => setListVaFilter(e.target.value)}
                      className="mt-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                      style={{ color: NAVY }}
                    >
                      <option value="">All</option>
                      {VA_NAMES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void loadClients()}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0F1923]"
                    style={{ backgroundColor: TEAL }}
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {listError ? <p className="text-sm text-red-600">{listError}</p> : null}
              {listSummary ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: "Active clients", value: listSummary.active_clients },
                    { label: "Trial clients", value: listSummary.trial_clients },
                    { label: "Cancelled clients", value: listSummary.cancelled_clients },
                    { label: "Stale bureau", value: listSummary.stale_bureau_count },
                    { label: "Graduation-ready", value: listSummary.graduation_ready_count },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-wide opacity-60">Subscription</span>
                  <select
                    value={clientSubscriptionFilter}
                    onChange={(e) => setClientSubscriptionFilter(e.target.value as "all" | "active" | "trial" | "cancelled" | "inactive")}
                    className="mt-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                    style={{ color: NAVY }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-wide opacity-60">Bureau</span>
                  <select
                    value={clientStaleFilter}
                    onChange={(e) => setClientStaleFilter(e.target.value as "all" | "stale" | "fresh")}
                    className="mt-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                    style={{ color: NAVY }}
                  >
                    <option value="all">All</option>
                    <option value="stale">Stale</option>
                    <option value="fresh">Fresh</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-wide opacity-60">Graduation</span>
                  <select
                    value={clientGraduationFilter}
                    onChange={(e) => setClientGraduationFilter(e.target.value as "all" | "ready" | "not_ready")}
                    className="mt-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                    style={{ color: NAVY }}
                  >
                    <option value="all">All</option>
                    <option value="ready">Ready</option>
                    <option value="not_ready">Not ready</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-wide opacity-60">Stalled</span>
                  <select
                    value={clientStalledFilter}
                    onChange={(e) => setClientStalledFilter(e.target.value as "all" | "not_started" | "partial")}
                    className="mt-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                    style={{ color: NAVY }}
                  >
                    <option value="all">All</option>
                    <option value="not_started">Not started</option>
                    <option value="partial">Partial</option>
                  </select>
                </label>
              </div>
              {listLoading ? (
                <p className="text-sm opacity-70">Loading…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-xs font-semibold uppercase tracking-wide opacity-60">
                        {CLIENT_TABLE_COLUMNS.map((col) => {
                          const active = clientSortKey === col.sortKey;
                          return (
                            <th key={col.sortKey} scope="col" className={col.className} aria-sort={active ? (clientSortDir === "asc" ? "ascending" : "descending") : undefined}>
                              <button
                                type="button"
                                onClick={() => onClientSortHeaderClick(col.sortKey)}
                                className="inline-flex items-baseline gap-0.5 text-left uppercase tracking-wide opacity-100 transition-opacity hover:opacity-80"
                              >
                                <span>{col.label}</span>
                                {active ? <span aria-hidden>{clientSortDir === "asc" ? "↑" : "↓"}</span> : null}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedClientRows.length === 0 ? (
                        <tr>
                          <td colSpan={CLIENT_TABLE_COLUMNS.length} className="py-8 text-center opacity-60">
                            No clients found.
                          </td>
                        </tr>
                      ) : (
                        displayedClientRows.map((row) => {
                          const selected = selectedClient?.id === row.id;
                          const tealRow =
                            row.auto_ready_alert
                              ? { backgroundColor: "rgba(0, 201, 167, 0.18)", boxShadow: `inset 0 0 0 1px ${TEAL}` }
                              : {};
                          const selectRing = selected ? { outline: `2px solid ${NAVY}`, outlineOffset: "-2px" } : {};
                          return (
                            <tr
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              className="cursor-pointer border-b border-black/5 transition-colors hover:bg-black/[0.03]"
                              style={{ ...tealRow, ...selectRing }}
                              onClick={() => setSelectedClient((prev) => (prev?.id === row.id ? null : row))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedClient((prev) => (prev?.id === row.id ? null : row));
                                }
                              }}
                            >
                              <td className="py-3 pr-3 font-semibold">{row.full_name ?? "—"}</td>
                              <td className="py-3 pr-3">{row.email ?? "—"}</td>
                              <td className="py-3 pr-3 tabular-nums">
                                {phoneTelHref(row.phone) ? (
                                  <a
                                    href={phoneTelHref(row.phone) ?? undefined}
                                    className="font-semibold underline underline-offset-2"
                                    style={{ color: TEAL }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {row.phone}
                                  </a>
                                ) : (
                                  (row.phone ?? "—")
                                )}
                              </td>
                              <td className="py-3 pr-3">{row.subscription_status ?? "—"}</td>
                              <td className="py-3 pr-3 tabular-nums">{row.current_month ?? "—"}</td>
                              <td className="py-3 pr-3 tabular-nums">
                                {row.equifax_score !== null && row.equifax_score !== undefined ? row.equifax_score : "—"}
                              </td>
                              <td className="py-3 pr-3">
                                {row.readiness_percentage !== null ? `${row.readiness_percentage}%` : "—"}
                              </td>
                              <td className="py-3 pr-3 whitespace-nowrap">{formatDate(row.last_activity)}</td>
                              <td className="py-3 pr-3">
                                {row.stalled_status === "not_started" ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                                    Not started
                                  </span>
                                ) : row.stalled_status === "partial" ? (
                                  <span className="rounded-full px-2 py-1 text-xs font-bold text-[#0F1923]" style={{ backgroundColor: TEAL }}>
                                    Partial — 1 step away
                                  </span>
                                ) : (
                                  <span className="text-xs opacity-50">—</span>
                                )}
                              </td>
                              <td className="py-3 pr-3">
                                {row.stale_bureau ? (
                                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Stale</span>
                                ) : (
                                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Fresh</span>
                                )}
                              </td>
                              <td className="py-3 pr-3">
                                {row.graduation_ready ? (
                                  <span className="rounded-full px-2 py-1 text-xs font-bold text-[#0F1923]" style={{ backgroundColor: TEAL }}>
                                    Ready
                                  </span>
                                ) : (
                                  <span className="text-xs opacity-50">—</span>
                                )}
                              </td>
                              <td className="py-3 pr-3 tabular-nums">
                                {row.top_actions_count > 0 ? `${row.actions_completed} / ${row.top_actions_count}` : row.actions_completed}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedClient ? (
              <div className="relative min-w-0 lg:max-w-[min(380px,100%)]">
                <button
                  type="button"
                  aria-label="Close client panel"
                  className="fixed inset-0 z-40 bg-black/45 lg:hidden"
                  onClick={() => setSelectedClient(null)}
                />
                <aside
                  className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-black/10 bg-white p-6 shadow-2xl lg:static lg:z-auto lg:max-w-none lg:rounded-2xl lg:border lg:shadow-sm lg:sticky lg:top-6"
                  style={{ borderColor: "rgba(15,25,35,0.08)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold">Client details</h2>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold opacity-60 hover:opacity-100"
                    >
                      Close
                    </button>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Full name</dt>
                      <dd className="mt-0.5 font-semibold">{selectedClient.full_name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Email</dt>
                      <dd className="mt-0.5 break-all">{selectedClient.email ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Phone</dt>
                      <dd className="mt-0.5 tabular-nums">{selectedClient.phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Primary goal</dt>
                      <dd className="mt-0.5">{selectedClient.primary_goal ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Assigned VA</dt>
                      <dd className="mt-0.5">{selectedClient.assigned_va ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Blueprint status</dt>
                      <dd className="mt-0.5 flex items-center gap-3">
                        <span>{selectedClient.blueprint_status}</span>
                        {selectedClient.blueprint_status === "ready" && selectedClient.blueprint_id ? (
                          <a
                            href={`/dashboard/blueprint?client_id=${selectedClient.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold underline"
                            style={{ color: TEAL }}
                          >
                            View Blueprint →
                          </a>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Current score (Equifax)</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {selectedClient.equifax_score !== null && selectedClient.equifax_score !== undefined
                          ? selectedClient.equifax_score
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Rebuild score</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {selectedClient.rebuild_score !== null && selectedClient.rebuild_score !== undefined && selectedClient.rebuild_score > 0
                          ? selectedClient.rebuild_score
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Utilization</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {selectedClient.utilization_percentage !== null && selectedClient.utilization_percentage !== undefined
                          ? `${selectedClient.utilization_percentage}%`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Actions completed (this month)</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {selectedClient.top_actions_count > 0
                          ? `${selectedClient.actions_completed} / ${selectedClient.top_actions_count}`
                          : `${selectedClient.actions_completed} / 0`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Subscription status</dt>
                      <dd className="mt-0.5">{selectedClient.subscription_status ?? "—"}</dd>
                    </div>
                  </dl>
                  <details className="mt-6 rounded-xl border border-black/10 p-3 text-xs" style={{ borderColor: "rgba(15,25,35,0.1)" }}>
                    <summary className="cursor-pointer font-semibold opacity-80">More</summary>
                    <dl className="mt-3 space-y-2">
                      <div>
                        <dt className="font-semibold uppercase tracking-wide opacity-50">Goals (record)</dt>
                        <dd className="mt-0.5">{formatGoals(selectedClient.goals)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide opacity-50">Free trial</dt>
                        <dd className="mt-0.5">{selectedClient.free_trial ? "Yes" : "No"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide opacity-50">Blueprint updated</dt>
                        <dd className="mt-0.5 whitespace-nowrap">{formatDate(selectedClient.blueprint_created_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide opacity-50">Client created</dt>
                        <dd className="mt-0.5 whitespace-nowrap">{formatDate(selectedClient.client_created_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide opacity-50">Readiness</dt>
                        <dd className="mt-0.5">
                          {selectedClient.readiness_percentage !== null ? `${selectedClient.readiness_percentage}%` : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide opacity-50">Auto-ready alert</dt>
                        <dd className="mt-0.5">{selectedClient.auto_ready_alert ? "Yes" : "No"}</dd>
                      </div>
                    </dl>
                  </details>
                </aside>
              </div>
            ) : (
              <div
                className="hidden rounded-2xl border border-dashed p-6 text-sm leading-relaxed opacity-60 lg:block"
                style={{ borderColor: "rgba(15,25,35,0.15)", backgroundColor: "rgba(255,255,255,0.6)" }}
              >
                Click a client row to open the side panel. Rows with a teal highlight have auto_ready_alert set on their latest blueprint.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
