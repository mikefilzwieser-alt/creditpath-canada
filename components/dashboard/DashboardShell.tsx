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
    };
  }
  return ctx;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/blueprint", label: "Blueprint" },
  { href: "/dashboard/upload", label: "Upload" },
  { href: "/dashboard/goals", label: "Goals" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

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
        if (!cancelled) setPaywallChecked(true);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("subscription_status, applied_promo_code, trial_start, stripe_customer_id, access_until")
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
        router.replace("/pricing");
        return;
      }
      setPaywallChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") !== "success") return;

    let cancelled = false;
    const stripParam = () => {
      url.searchParams.delete("payment");
      const q = url.searchParams.toString();
      router.replace(`${url.pathname}${q ? `?${q}` : ""}`);
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
    }),
    [user, loading, refreshUser, headingFontClass],
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
                {NAV.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
        </div>
      )}
    </DashboardAuthContext.Provider>
  );
}
