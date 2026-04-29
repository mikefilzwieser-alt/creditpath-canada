import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasDashboardPaywallAccess } from "@/lib/dashboard-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, {
      path: c.path,
      domain: c.domain,
      maxAge: c.maxAge,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    });
  }
}

type ClientPaywallRow = {
  subscription_status: string | null;
  applied_promo_code: string | null;
  trial_start: string | null;
  stripe_customer_id: string | null;
  access_until: string | null;
  goal_selected: boolean | null;
};

/**
 * Next.js App Router client navigations load RSC payloads with `rsc: 1` / `Sec-Fetch-Dest: empty`.
 * Returning 302 from those requests poisons the client router — users appear to "bounce" back to
 * the current page. Subscription redirects must only run on real document navigations.
 */
function isDashboardSoftNavigation(request: NextRequest): boolean {
  if (request.headers.get("rsc") === "1") return true;
  if (request.headers.get("next-router-prefetch") === "1") return true;
  if (request.headers.get("next-router-segment-prefetch") === "1") return true;
  if (request.headers.get("Sec-Fetch-Dest") === "empty") return true;
  if (request.headers.get("Sec-Fetch-Mode") === "cors") return true;
  if (request.headers.get("Sec-Fetch-Mode") === "same-origin" && request.headers.get("Sec-Fetch-Dest") === "empty")
    return true;
  return false;
}

/**
 * Whether a client currently has paid dashboard access.
 */
function hasPaidDashboardAccess(row: ClientPaywallRow | null, readError: boolean, paymentSuccess: boolean): boolean {
  if (paymentSuccess) return true;
  if (readError || !row) return false;
  return hasDashboardPaywallAccess({
    subscriptionStatus: row.subscription_status,
    appliedPromoCode: row.applied_promo_code,
    trialStart: row.trial_start,
    stripeCustomerId: row.stripe_customer_id,
    accessUntil: row.access_until,
  });
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (user && pathname.startsWith("/dashboard")) {
    if (isDashboardSoftNavigation(request)) {
      return supabaseResponse;
    }

    const paymentSuccess = request.nextUrl.searchParams.get("payment") === "success";

    if (paymentSuccess) {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { error: activateErr } = await admin
          .from("clients")
          .update({ subscription_status: "active" })
          .eq("id", user.id);
        if (activateErr) {
          console.warn("[dashboard paywall] optimistic subscription_status=active failed", {
            userId: user.id,
            message: activateErr.message,
          });
        }
      } else {
        console.warn("[dashboard paywall] payment=success but admin client unavailable; allowing access anyway");
      }
    }

    const { data: row, error } = await supabase
      .from("clients")
      .select("subscription_status, applied_promo_code, trial_start, stripe_customer_id, access_until, goal_selected")
      .eq("id", user.id)
      .maybeSingle();

    const readError = Boolean(error);
    const effectiveRow = (readError ? null : row) as ClientPaywallRow | null;
    const statusRead = effectiveRow?.subscription_status ?? null;
    const stripeRead = effectiveRow?.stripe_customer_id ?? null;
    const accessUntilRead = effectiveRow?.access_until ?? null;
    const goalSelectedRead = effectiveRow?.goal_selected ?? null;

    console.log("[dashboard paywall] client row", {
      userId: user.id,
      path: pathname,
      subscription_status: statusRead,
      stripe_customer_id: stripeRead,
      access_until: accessUntilRead,
      goal_selected: goalSelectedRead,
      rowPresent: Boolean(effectiveRow),
      fetchError: error?.message ?? null,
      paymentSuccessQuery: paymentSuccess,
      readError,
    });

    if (readError || !effectiveRow) {
      const redirectRes = NextResponse.redirect(new URL("/pricing", request.url));
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }

    const paid = hasPaidDashboardAccess(effectiveRow, readError, paymentSuccess);
    if (!paid) {
      if (pathname === "/dashboard/goals") {
        return supabaseResponse;
      }
      if (effectiveRow.goal_selected === false) {
        const redirectRes = NextResponse.redirect(new URL("/dashboard/goals", request.url));
        copyCookies(supabaseResponse, redirectRes);
        return redirectRes;
      }
      if (pathname !== "/dashboard") {
        const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
        copyCookies(supabaseResponse, redirectRes);
        return redirectRes;
      }
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"],
};
