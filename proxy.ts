import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasDashboardPaywallAccess } from "@/lib/dashboard-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

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
  return false;
}

/**
 * Redirect to /pricing when the user should not use the dashboard yet.
 * - `?payment=success`: optimistic `active` update then allow (document navigation from Stripe).
 * - Allow `active`, or CCVIP2026 comp on `applied_promo_code`.
 * - Allow `trial` only when `stripe_customer_id` is set (post-checkout).
 * - If the `clients` row cannot be read, redirect (fail closed).
 * - Otherwise redirect — including `trial` without Stripe customer.
 */
function shouldRedirectToPricing(
  row: ClientPaywallRow | null,
  readError: boolean,
  paymentSuccess: boolean,
): boolean {
  if (paymentSuccess) return false;
  if (readError) return true;
  if (!row) return true;
  return !hasDashboardPaywallAccess({
    subscriptionStatus: row.subscription_status,
    appliedPromoCode: row.applied_promo_code,
    trialStart: row.trial_start,
    stripeCustomerId: row.stripe_customer_id,
  });
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

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
      .select("subscription_status, applied_promo_code, trial_start, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const readError = Boolean(error);
    const effectiveRow = (readError ? null : row) as ClientPaywallRow | null;
    const statusRead = effectiveRow?.subscription_status ?? null;
    const stripeRead = effectiveRow?.stripe_customer_id ?? null;

    console.log("[dashboard paywall] client row", {
      userId: user.id,
      path: pathname,
      subscription_status: statusRead,
      stripe_customer_id: stripeRead,
      rowPresent: Boolean(effectiveRow),
      fetchError: error?.message ?? null,
      paymentSuccessQuery: paymentSuccess,
      readError,
    });

    if (shouldRedirectToPricing(effectiveRow, readError, paymentSuccess)) {
      console.log("[dashboard paywall] redirect → /pricing", {
        userId: user.id,
        subscription_status: statusRead,
        stripe_customer_id: stripeRead,
        fetchError: error?.message ?? null,
      });
      const redirectRes = NextResponse.redirect(new URL("/pricing", request.url));
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
  }

  return supabaseResponse;
}

/** Only run subscription logic on dashboard routes (not every asset / RSC site-wide). */
export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};

