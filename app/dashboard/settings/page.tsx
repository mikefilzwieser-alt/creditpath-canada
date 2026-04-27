"use client";

import { Montserrat } from "next/font/google";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const BG = "#F5F7FA";
const CARD_BORDER = "rgba(15, 25, 35, 0.08)";
const DANGER = "#c5221f";

type ClientRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  primary_goal: string | null;
  assigned_va: string | null;
  subscription_status: string | null;
  trial_start: string | null;
  stripe_customer_id: string | null;
};

function displayValue(v: string | null | undefined): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : "—";
}

function subscriptionBucket(status: string | null | undefined): "trial" | "active" | "inactive" | "cancelled" {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "trial") return "trial";
  if (s === "active") return "active";
  if (s === "cancelled") return "cancelled";
  return "inactive";
}

function subscriptionTitle(status: string | null | undefined): string {
  const b = subscriptionBucket(status);
  if (b === "trial") return "Trial";
  if (b === "active") return "Active";
  if (b === "cancelled") return "Cancelled";
  return "Inactive";
}

function trialEndDate(trialStart: string | null | undefined): Date | null {
  if (!trialStart) return null;
  const start = new Date(trialStart);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return end;
}

function formatTrialEnd(d: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function clientFirstName(
  client: ClientRow | null,
  authUser: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
): string {
  const fromClient = client?.full_name?.trim();
  if (fromClient) {
    const first = fromClient.split(/\s+/)[0];
    if (first) return first;
  }
  const meta = authUser?.user_metadata ?? {};
  const full = meta.full_name;
  if (typeof full === "string" && full.trim()) {
    const part = full.trim().split(/\s+/)[0];
    if (part) return part;
  }
  const firstName = meta.first_name;
  if (typeof firstName === "string" && firstName.trim()) return firstName.trim();
  const email = authUser?.email?.trim();
  if (email && email.includes("@")) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return "there";
}

export default function SettingsPage() {
  const { user, loading: authLoading, headingFontClass } = useDashboardAuth();
  const h = headingFontClass || montserrat.className;

  const [loadingClient, setLoadingClient] = useState(true);
  const [client, setClient] = useState<ClientRow | null>(null);
  /** Latest blueprint `current_month` for cancel retention copy (defaults to 1 if none). */
  const [blueprintProgramMonth, setBlueprintProgramMonth] = useState(1);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState("");

  /** 0 = closed, 1 = first retention step, 2 = final confirmation before API */
  const [cancelModalStep, setCancelModalStep] = useState<0 | 1 | 2>(0);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const loadClient = useCallback(async () => {
    if (!user) return;
    setLoadingClient(true);
    const [clientRes, blueprintRes] = await Promise.all([
      supabase
        .from("clients")
        .select(
          "full_name, email, phone, primary_goal, assigned_va, subscription_status, trial_start, stripe_customer_id",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("blueprints")
        .select("current_month")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (clientRes.error) {
      setClient(null);
    } else {
      setClient(clientRes.data as ClientRow);
    }

    const bp = blueprintRes.data as { current_month?: number | null } | null;
    const raw = bp?.current_month;
    const month =
      typeof raw === "number" && Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
    setBlueprintProgramMonth(month);

    setLoadingClient(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadClient();
    });
    return () => {
      cancelled = true;
    };
  }, [user, loadClient]);

  const submitPassword = useCallback(async () => {
    setPasswordMessage(null);
    const email = user?.email?.trim();
    if (!email) {
      setPasswordMessage({ type: "err", text: "Your account has no email on file; contact support to reset your password." });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "err", text: "New password and confirmation do not match." });
      return;
    }
    if (!currentPassword) {
      setPasswordMessage({ type: "err", text: "Enter your current password." });
      return;
    }

    setPasswordBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signErr) {
        setPasswordMessage({ type: "err", text: signErr.message || "Current password is incorrect." });
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) {
        setPasswordMessage({ type: "err", text: updErr.message || "Could not update password." });
        return;
      }

      setPasswordMessage({ type: "ok", text: "Your password was updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage({ type: "err", text: "Something went wrong. Try again." });
    } finally {
      setPasswordBusy(false);
    }
  }, [user?.email, currentPassword, newPassword, confirmPassword]);

  const confirmCancelSubscription = useCallback(async () => {
    setCancelError("");
    setCancelBusy(true);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok !== true) {
        setCancelError(data.error ?? "Could not cancel your subscription.");
        return;
      }
      setCancelModalStep(0);
      setCancelSuccess(true);
      await loadClient();
    } catch {
      setCancelError("Network error.");
    } finally {
      setCancelBusy(false);
    }
  }, [loadClient]);

  const openBillingPortal = useCallback(async () => {
    setPortalError("");
    setPortalBusy(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setPortalError(data.error ?? "Could not open the billing portal.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setPortalError("Billing portal did not return a URL.");
    } catch {
      setPortalError("Network error.");
    } finally {
      setPortalBusy(false);
    }
  }, []);

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

  const subBucket = subscriptionBucket(client?.subscription_status);
  const trialEnd = subBucket === "trial" ? trialEndDate(client?.trial_start ?? null) : null;
  const hasStripeCustomer = Boolean(client?.stripe_customer_id?.trim());
  const subStatusLower = (client?.subscription_status ?? "").trim().toLowerCase();
  const canCancelSubscription =
    (subStatusLower === "active" || subStatusLower === "trial") && !cancelSuccess;

  const infoRows: { label: string; value: string }[] = [
    { label: "Full name", value: displayValue(client?.full_name) },
    { label: "Email", value: displayValue(client?.email ?? user.email) },
    { label: "Phone", value: displayValue(client?.phone) },
    { label: "Primary goal", value: displayValue(client?.primary_goal) },
    { label: "Assigned VA", value: displayValue(client?.assigned_va) },
  ];

  return (
    <div className={`mx-auto max-w-2xl space-y-8 ${montserrat.className}`} style={{ color: NAVY, fontFamily: "inherit" }}>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
          Account
        </p>
        <h1 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>Settings</h1>
        <p className="mt-2 text-sm text-[#0F1923]/65">View your profile and manage password and billing.</p>
      </header>

      <section
        className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
        style={{ borderColor: CARD_BORDER }}
      >
        <h2 className={`text-lg font-bold ${h}`}>Your information</h2>
        <p className="mt-1 text-sm text-[#0F1923]/65">Read-only details from your client record.</p>

        {loadingClient ? (
          <div className="mt-8 flex justify-center py-6">
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
              aria-label="Loading profile"
            />
          </div>
        ) : (
          <dl className="mt-6 space-y-4">
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
                style={{ borderColor: "rgba(15, 25, 35, 0.1)", backgroundColor: BG }}
              >
                <dt className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>
                  {row.label}
                </dt>
                <dd className={`mt-1 text-sm font-semibold sm:mt-0 sm:text-right ${h}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section
        className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
        style={{ borderColor: CARD_BORDER }}
      >
        <h2 className={`text-lg font-bold ${h}`}>Change password</h2>
        <p className="mt-1 text-sm text-[#0F1923]/65">Confirm your current password, then choose a new one (minimum 8 characters).</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitPassword();
          }}
        >
          <div>
            <label htmlFor="current-password" className={`block text-xs font-bold uppercase tracking-wide ${h}`} style={{ color: TEAL }}>
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-teal-500/30 focus:ring-2 ${h}`}
              style={{ borderColor: "rgba(15, 25, 35, 0.15)", color: NAVY }}
            />
          </div>
          <div>
            <label htmlFor="new-password" className={`block text-xs font-bold uppercase tracking-wide ${h}`} style={{ color: TEAL }}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-teal-500/30 focus:ring-2 ${h}`}
              style={{ borderColor: "rgba(15, 25, 35, 0.15)", color: NAVY }}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className={`block text-xs font-bold uppercase tracking-wide ${h}`} style={{ color: TEAL }}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-teal-500/30 focus:ring-2 ${h}`}
              style={{ borderColor: "rgba(15, 25, 35, 0.15)", color: NAVY }}
            />
          </div>

          {passwordMessage ? (
            <p
              className="text-sm font-semibold"
              style={{ color: passwordMessage.type === "ok" ? TEAL : "#b42318" }}
              role="status"
              aria-live="polite"
            >
              {passwordMessage.text}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={passwordBusy}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50 ${h}`}
            style={{ backgroundColor: TEAL, color: NAVY }}
          >
            {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <section
        className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
        style={{ borderColor: CARD_BORDER }}
      >
        <h2 className={`text-lg font-bold ${h}`}>Subscription</h2>
        <p className="mt-1 text-sm text-[#0F1923]/65">Your program access and Stripe billing.</p>

        <div
          className="mt-6 rounded-xl border px-4 py-4"
          style={{ borderColor: "rgba(15, 25, 35, 0.1)", backgroundColor: BG }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>
            Status
          </p>
          <p className={`mt-2 text-xl font-bold ${h}`}>{subscriptionTitle(client?.subscription_status)}</p>
          {subBucket === "cancelled" ? (
            <p className="mt-2 text-sm text-[#0F1923]/70">
              Your subscription is cancelled. You keep access to your blueprint and coaching through the end of your
              current billing period.
            </p>
          ) : null}
          {subBucket === "trial" && trialEnd ? (
            <p className="mt-2 text-sm text-[#0F1923]/70">
              Trial ends on <span className="font-semibold text-[#0F1923]">{formatTrialEnd(trialEnd)}</span> (30 days from
              your trial start).
            </p>
          ) : subBucket === "trial" && !trialEnd ? (
            <p className="mt-2 text-sm text-[#0F1923]/70">Trial end date will appear once your trial start is recorded.</p>
          ) : null}
        </div>

        {portalError ? (
          <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
            {portalError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            disabled={portalBusy || !hasStripeCustomer}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 px-6 py-2.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-45 ${h}`}
            style={{ borderColor: TEAL, color: NAVY, backgroundColor: "#fff" }}
          >
            {portalBusy ? "Opening…" : "Manage billing"}
          </button>
          {!hasStripeCustomer ? (
            <p className="text-sm text-[#0F1923]/70">
              Billing portal unlocks after you have a Stripe subscription.{" "}
              <Link href="/pricing" className="font-bold underline decoration-teal-600/40 hover:opacity-90" style={{ color: TEAL }}>
                Go to Pricing
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8"
        style={{ borderColor: CARD_BORDER, backgroundColor: "#fff" }}
        aria-labelledby="cancel-subscription-heading"
      >
        <h2 id="cancel-subscription-heading" className={`text-lg font-bold ${h}`}>
          Cancel subscription
        </h2>
        <p className="mt-1 text-sm text-[#0F1923]/65">
          If you cancel, you will not be charged again. You can keep using the program until the end of your current
          billing period.
        </p>

        {cancelSuccess ? (
          <p className="mt-5 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: TEAL, color: NAVY, backgroundColor: "rgba(0,201,167,0.12)" }} role="status" aria-live="polite">
            Your subscription has been cancelled. You&apos;ll have access until the end of your current billing period.
          </p>
        ) : canCancelSubscription && !loadingClient ? (
          <button
            type="button"
            onClick={() => {
              setCancelError("");
              setCancelModalStep(1);
            }}
            className={`mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 ${h}`}
            style={{ backgroundColor: DANGER }}
          >
            Cancel subscription
          </button>
        ) : null}

        {!canCancelSubscription && !cancelSuccess && !loadingClient ? (
          <p className="mt-3 text-sm text-[#0F1923]/65">
            {subBucket === "cancelled"
              ? "You have already cancelled."
              : subStatusLower === "inactive"
                ? "This account is no longer on an active plan."
                : "Cancellation is not available for your current subscription status."}
          </p>
        ) : null}
      </section>

      {cancelModalStep > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15, 25, 35, 0.55)" }}
          role="presentation"
          onClick={() => {
            if (!cancelBusy) {
              setCancelModalStep(0);
              setCancelError("");
            }
          }}
        >
          <div
            className={`max-w-md rounded-2xl border bg-white p-6 shadow-xl sm:p-8 ${h}`}
            style={{ borderColor: CARD_BORDER, color: NAVY }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={cancelModalStep === 1 ? "cancel-dialog-step1-title" : "cancel-dialog-step2-title"}
            onClick={(e) => e.stopPropagation()}
          >
            {cancelModalStep === 1 ? (
              <>
                <h3 id="cancel-dialog-step1-title" className="text-lg font-bold">
                  Hold on, {clientFirstName(client, user)}.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#0F1923]/80">
                  You&apos;re making progress already {blueprintProgramMonth} months in!
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0F1923]/80">
                  Are you <span style={{ color: "#00C9A7" }}>100%</span> positive you want to give up on your goals?
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => {
                      setCancelModalStep(0);
                      setCancelError("");
                    }}
                    className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50 ${h}`}
                    style={{ backgroundColor: TEAL, color: NAVY }}
                  >
                    Keep my plan
                  </button>
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => {
                      setCancelError("");
                      setCancelModalStep(2);
                    }}
                    className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold text-[#0F1923]/75 transition-opacity hover:bg-black/[0.03] disabled:opacity-50 ${h}`}
                    style={{ borderColor: "rgba(15, 25, 35, 0.2)", backgroundColor: "rgba(15, 25, 35, 0.06)" }}
                  >
                    I want to cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 id="cancel-dialog-step2-title" className="text-lg font-bold">
                  Last chance.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#0F1923]/80">
                  Are you{" "}
                  <span style={{ color: "#00C9A7", fontWeight: 700 }}>100%</span>
                  {" "}
                  sure you don&apos;t want to hit your goals?
                </p>
                <p style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                  For less than <span style={{ color: "#00C9A7", fontWeight: 600 }}>50¢ a day</span> — your credit path is
                  still open. 🚗
                </p>
                {cancelError ? (
                  <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
                    {cancelError}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col gap-4">
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => {
                      setCancelModalStep(0);
                      setCancelError("");
                    }}
                    className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50 ${h}`}
                    style={{ backgroundColor: TEAL, color: NAVY }}
                  >
                    Actually, keep my plan
                  </button>
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => void confirmCancelSubscription()}
                    className={`mx-auto block py-1 text-center text-xs font-medium text-[#0F1923]/45 underline decoration-[#0F1923]/20 underline-offset-2 transition-opacity hover:text-[#0F1923]/60 disabled:opacity-40 ${h}`}
                  >
                    {cancelBusy ? "Cancelling…" : "Yes, cancel anyway"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
