"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { hasDashboardPaywallAccess } from "@/lib/dashboard-access";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const BG = "#F5F7FA";

export type DashboardAuthContextValue = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  headingFontClass: string;
  hasDashboardAccess: boolean;
};

const DashboardAuthContext = createContext<DashboardAuthContextValue | null>(null);

/** Safe during SSR/prerender: returns a loading sentinel if the provider is not mounted yet. */
export function useDashboardAuth(): DashboardAuthContextValue {
  const ctx = useContext(DashboardAuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: true,
      refreshUser: async () => {},
      headingFontClass: "",
      hasDashboardAccess: true,
    };
  }
  return ctx;
}

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/blueprint", label: "Blueprint" },
  { href: "/dashboard/blueprint#monthly-actions", label: "Actions" },
  { href: "/dashboard/upload", label: "Upload" },
  { href: "/dashboard/goals", label: "Goals" },
  { href: "/dashboard/resources", label: "Resources" },
  { href: "/dashboard/settings", label: "Settings" },
];

function isNavItemActive(pathname: string, hash: string, href: string): boolean {
  const [base, fragment] = href.split("#");
  if (href === "/dashboard") return pathname === "/dashboard";
  if (!pathname.startsWith(base)) return false;
  if (fragment) return hash === `#${fragment}`;
  if (base === "/dashboard/blueprint") return hash !== "#monthly-actions";
  return true;
}

type DashboardShellProps = {
  children: React.ReactNode;
  headingFontClass: string;
  bodyFontClass: string;
};

export function DashboardShell({
  children,
  headingFontClass,
  bodyFontClass,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  /** False until subscription/promo paywall check finishes (mirrors proxy for client navigations). */
  const [paywallChecked, setPaywallChecked] = useState(false);
  const [hasDashboardAccess, setHasDashboardAccess] = useState(true);
  const [routeHash, setRouteHash] = useState("");
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [firstLoginSlide, setFirstLoginSlide] = useState(0);
  /** Optimistic dismiss so the modal hides immediately; reset when the signed-in user changes. */
  const firstLoginDismissedRef = useRef(false);

  useEffect(() => {
    firstLoginDismissedRef.current = false;
  }, [user?.id]);

  const markFirstLoginSeen = useCallback(() => {
    if (!user?.id) return;
    firstLoginDismissedRef.current = true;
    setShowFirstLoginModal(false);
    setFirstLoginSlide(0);
    void (async () => {
      const { error } = await supabase.from("clients").update({ first_login_seen: true }).eq("id", user.id);
      if (error) {
        console.error("[dashboard] first_login_seen update failed", error.message);
      }
    })();
  }, [user?.id]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        router.replace("/onboarding");
        return;
      }
      setUser(data.user);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.replace("/onboarding");
        return;
      }
      if (session) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncHash = () => setRouteHash(window.location.hash || "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      queueMicrotask(() => setPaywallChecked(true));
      return;
    }

    const paymentSuccess =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("payment") === "success";

    // Do not queue paywallChecked=false when Stripe is returning: a microtask(false) would run
    // after the async branch sets true and would leave the shell stuck on the blocking loader.
    if (!paymentSuccess) {
      queueMicrotask(() => setPaywallChecked(false));
    }

    let cancelled = false;
    void (async () => {
      if (paymentSuccess) {
        setHasDashboardAccess(true);
        if (!cancelled) {
          const { data: flData, error: flErr } = await supabase
            .from("clients")
            .select("first_login_seen")
            .eq("id", user.id)
            .maybeSingle();
          if (!cancelled && !flErr && flData?.first_login_seen === true) {
            firstLoginDismissedRef.current = true;
          }
          if (
            !cancelled &&
            !flErr &&
            flData &&
            flData.first_login_seen === false &&
            !firstLoginDismissedRef.current
          ) {
            setFirstLoginSlide(0);
            setShowFirstLoginModal(true);
          }
        }
        if (!cancelled) setPaywallChecked(true);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select(
          "subscription_status, applied_promo_code, trial_start, stripe_customer_id, access_until, first_login_seen",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      console.log("[dashboard paywall] DashboardShell client row", {
        userId: user.id,
        subscription_status: data?.subscription_status ?? null,
        stripe_customer_id: data?.stripe_customer_id ?? null,
        access_until: data?.access_until ?? null,
        fetchError: error?.message ?? null,
      });
      if (error) {
        router.replace("/pricing");
        return;
      }
      if (
        !hasDashboardPaywallAccess({
          subscriptionStatus: data?.subscription_status,
          appliedPromoCode: data?.applied_promo_code,
          trialStart: data?.trial_start,
          stripeCustomerId: data?.stripe_customer_id,
          accessUntil: data?.access_until,
        })
      ) {
        const { data: existingBlueprint } = await supabase
          .from("blueprints")
          .select("id")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (existingBlueprint?.id) {
          setHasDashboardAccess(false);
          setPaywallChecked(true);
          if (pathname !== "/dashboard") {
            router.replace("/dashboard");
          }
          return;
        }
        router.replace("/pricing");
        return;
      }
      setHasDashboardAccess(true);

      if (!cancelled && data?.first_login_seen === true) {
        firstLoginDismissedRef.current = true;
      }

      if (!cancelled && data && data.first_login_seen === false && !firstLoginDismissedRef.current) {
        setFirstLoginSlide(0);
        setShowFirstLoginModal(true);
      }
      setPaywallChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading, pathname, router]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") !== "success") return;

    let cancelled = false;
    const stripParam = () => {
      url.searchParams.delete("payment");
      const q = url.searchParams.toString();
      router.replace(`${window.location.pathname}${q ? `?${q}` : ""}`);
    };

    const poll = async () => {
      const { data } = await supabase
        .from("clients")
        .select("subscription_status, applied_promo_code, trial_start, stripe_customer_id, access_until")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (
        hasDashboardPaywallAccess({
          subscriptionStatus: data?.subscription_status,
          appliedPromoCode: data?.applied_promo_code,
          trialStart: data?.trial_start,
          stripeCustomerId: data?.stripe_customer_id,
          accessUntil: data?.access_until,
        })
      ) {
        stripParam();
      }
    };

    const id = window.setInterval(() => void poll(), 2500);
    void poll();
    const t = window.setTimeout(() => window.clearInterval(id), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(t);
    };
  }, [user, router]);

  const authValue = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      headingFontClass,
      hasDashboardAccess,
    }),
    [user, loading, refreshUser, headingFontClass, hasDashboardAccess],
  );

  const blockingLoader = loading || (Boolean(user) && !paywallChecked);

  return (
    <DashboardAuthContext.Provider value={authValue}>
      {blockingLoader ? (
        <>
          <div
            className={`fixed inset-0 z-50 flex min-h-screen items-center justify-center ${bodyFontClass}`}
            style={{ backgroundColor: BG }}
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
              aria-label="Loading"
            />
          </div>
          {/* Mount route trees during auth resolution so client hooks always run inside Provider (Vercel/SSR-safe). */}
          <div
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0"
            aria-hidden
            inert
          >
            {children}
          </div>
        </>
      ) : !user ? null : (
        <div
          className="flex min-h-screen flex-col md:flex-row"
          style={{ backgroundColor: BG, color: NAVY }}
        >
          <aside
            className={`flex shrink-0 flex-col border-b border-white/10 md:min-h-screen md:border-b-0 md:border-r md:border-white/10 ${headingFontClass}`}
            style={{ backgroundColor: NAVY }}
          >
            <div className="flex flex-1 flex-row items-center gap-3 overflow-x-auto px-3 py-4 md:flex-col md:items-stretch md:px-0 md:py-8">
              <Link
                href="/dashboard"
                className="flex shrink-0 items-center px-3 py-3 md:block md:px-6 md:pb-4 md:pt-2"
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    padding: 6,
                    borderRadius: 12,
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <Image
                    src="/Teal Logo.png"
                    alt="Credit Path Canada"
                    width={320}
                    height={80}
                    sizes="280px"
                    priority
                    style={{
                      height: "80px",
                      width: "auto",
                      maxWidth: "min(calc(100vw - 3rem), 260px)",
                      borderRadius: 12,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </span>
              </Link>
              <nav className="flex min-w-0 flex-1 flex-row gap-1 md:flex-col md:px-3">
                {NAV_ITEMS.map((item) => {
                  const active = isNavItemActive(pathname, routeHash, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors md:py-3"
                      style={{
                        backgroundColor: active ? "rgba(0, 201, 167, 0.15)" : "transparent",
                        color: active ? TEAL : "rgba(255,255,255,0.85)",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="mt-auto border-t border-white/10 px-3 py-4 md:px-3 md:pb-8">
              <div className="px-4 pb-4 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                Questions? <a href="mailto:info@creditpathcanada.ca" style={{ color: "#00C9A7" }}>info@creditpathcanada.ca</a>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                }}
                className="w-full whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white md:py-3"
              >
                Sign out
              </button>
            </div>
          </aside>
          <main className={`min-w-0 flex-1 p-6 md:p-10 ${bodyFontClass}`}>{children}</main>

          {showFirstLoginModal ? (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F1923]/55 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="first-login-modal-title"
            >
              <div
                className={`w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl sm:p-8 ${headingFontClass}`}
                style={{ borderColor: "rgba(15, 25, 35, 0.1)", color: NAVY }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
                  {firstLoginSlide + 1} / 3
                </p>
                <h2 id="first-login-modal-title" className="mt-4 text-xl font-bold leading-snug sm:text-2xl">
                  {firstLoginSlide === 0 ? (
                    <>Welcome to Credit Path Canada.</>
                  ) : firstLoginSlide === 1 ? (
                    <>Your Blueprint is your roadmap.</>
                  ) : (
                    <>3 actions. Every month. That&apos;s it.</>
                  )}
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed" style={{ color: "rgba(15, 25, 35, 0.82)" }}>
                  {firstLoginSlide === 0 ? (
                    <p>
                      You just made the most important decision for your financial future. Over the next{" "}
                      <span style={{ color: TEAL }}>8-12 months</span>{" "}we&apos;re going to move your credit score — month
                      by month — based on your actual file. No generic tips. No guesswork.{" "}
                      <span style={{ color: TEAL }}>A real plan built for you</span>.
                    </p>
                  ) : firstLoginSlide === 1 ? (
                    <p>
                      Every recommendation is built from your <span style={{ color: TEAL }}>actual Equifax bureau</span>{" "}
                      — your tradelines, your collections, your inquiries. Nothing generic. Log in anytime to see{" "}
                      <span style={{ color: TEAL }}>exactly where you stand</span> and{" "}
                      <span style={{ color: TEAL }}>what to do next</span>.
                    </p>
                  ) : (
                    <p>
                      Each month you get <span style={{ color: TEAL }}>3 clear actions</span> ranked by score impact.
                      Complete them, wait <span style={{ color: TEAL }}>28 days</span>, and your next month unlocks
                      automatically.{" "}
                      <span style={{ color: TEAL }}>The clients who follow through are the ones who get approved.</span>
                    </p>
                  )}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => markFirstLoginSeen()}
                    className="text-sm font-semibold underline decoration-[#0F1923]/25 underline-offset-2"
                    style={{ color: "rgba(15, 25, 35, 0.55)" }}
                  >
                    Skip
                  </button>
                  <div className="flex gap-2">
                    {firstLoginSlide > 0 ? (
                      <button
                        type="button"
                        onClick={() => setFirstLoginSlide((s) => Math.max(0, s - 1))}
                        className="rounded-xl border px-4 py-2.5 text-sm font-bold"
                        style={{ borderColor: "rgba(15, 25, 35, 0.2)", color: NAVY }}
                      >
                        Back
                      </button>
                    ) : null}
                    {firstLoginSlide < 2 ? (
                      <button
                        type="button"
                        onClick={() => setFirstLoginSlide((s) => s + 1)}
                        className="rounded-xl px-5 py-2.5 text-sm font-bold"
                        style={{ backgroundColor: TEAL, color: NAVY }}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markFirstLoginSeen()}
                        className="rounded-xl px-5 py-2.5 text-sm font-bold"
                        style={{ backgroundColor: TEAL, color: NAVY }}
                      >
                        Get started
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardAuthContext.Provider>
  );
}
