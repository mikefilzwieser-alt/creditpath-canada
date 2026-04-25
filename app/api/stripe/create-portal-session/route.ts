import { NextResponse } from "next/server";
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
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    return NextResponse.json({ error: "You must be signed in to manage billing." }, { status: 401 });
  }

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 400 });
  }

  const customerId = (client as { stripe_customer_id?: string | null } | null)?.stripe_customer_id?.trim();
  if (!customerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer on file yet. Complete checkout on the Pricing page to set up billing, then return here.",
      },
      { status: 400 },
    );
  }

  const origin = appOrigin(request);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Billing portal did not return a URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
