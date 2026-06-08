import { NextResponse } from "next/server";
import { normalizeAppliedPromoCode } from "@/lib/dashboard-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    return NextResponse.json({ error: "You must be signed in to start checkout." }, { status: 401 });
  }

  let promoCode: string | undefined;
  try {
    const body = (await request.json()) as { promoCode?: unknown };
    if (typeof body?.promoCode === "string" && body.promoCode.trim()) {
      promoCode = body.promoCode.trim();
    }
  } catch {
    // Optional JSON body (e.g. pricing page POST with no body).
  }

  const email = user.email?.trim() || undefined;
  const origin = appOrigin(request);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      payment_method_types: ["card", "acss_debit"],
      payment_method_collection: "always",
      payment_method_options: {
        acss_debit: {
          mandate_options: {
            payment_schedule: "interval",
            transaction_type: "personal",
            interval_description: "Biweekly Credit Path Canada subscription",
          },
          currency: "cad",
          verification_method: "automatic",
        },
      },
      client_reference_id: user.id,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Must match dashboard return handler (`?payment=success` + client-side activation).
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    if (promoCode) {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        await supabaseAdmin.from("clients").update({
          applied_promo_code: normalizeAppliedPromoCode(promoCode),
        }).eq("id", user.id);
      }
    }

    if (!session.url) {
      return NextResponse.json({ error: "Checkout session did not return a URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
