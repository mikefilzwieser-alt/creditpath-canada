"use client";

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

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.replace("/onboarding");
        return;
      }
      setUser(data.session.user);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/onboarding");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const authValue = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      headingFontClass,
    }),
    [user, loading, refreshUser, headingFontClass],
  );

  return (
    <DashboardAuthContext.Provider value={authValue}>
      {loading ? (
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
            className={`shrink-0 border-b border-white/10 md:border-b-0 md:border-r md:border-white/10 ${headingFontClass}`}
            style={{ backgroundColor: NAVY }}
          >
            <div className="flex flex-row gap-1 overflow-x-auto px-3 py-4 md:flex-col md:px-0 md:py-8">
              <div className="hidden px-6 pb-6 md:block">
                <span className="text-lg font-bold tracking-tight text-white">Credit Path</span>
              </div>
              <nav className="flex flex-row gap-1 md:flex-col md:px-3">
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
          </aside>
          <main className={`min-w-0 flex-1 p-6 md:p-10 ${bodyFontClass}`}>{children}</main>
        </div>
      )}
    </DashboardAuthContext.Provider>
  );
}
