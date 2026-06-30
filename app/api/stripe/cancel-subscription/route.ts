import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe-server";
import { sendWinbackEmail } from "@/lib/send-winback-email";
import { isEligibleForWinbackEmail } from "@/lib/email-eligibility";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe-token";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function maybeSendWinbackEmail(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin
    .from("clients")
    .select("full_name, email, unsubscribed_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.email || !isEligibleForWinbackEmail(data)) return;
  const unsubscribeUrl = generateUnsubscribeUrl(userId);
  void sendWinbackEmail(data.email, data.full_name ?? "", unsubscribeUrl).catch(() => null);
}

export async function POST() {
  console.log("[cancel-subscription] Step 0: start");

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.log("[cancel-subscription] Step 0: fail — no Supabase admin client");
    return NextResponse.json({ error: "Server is not configured to update billing records." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    console.log("[cancel-subscription] Step 0: fail — not signed in", authErr?.message ?? null);
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  console.log("[cancel-subscription] Step 1: authenticated user", { userId: user.id });

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .select("stripe_customer_id, subscription_status, access_until")
    .eq("id", user.id)
    .maybeSingle();

  if (clientErr) {
    console.log("[cancel-subscription] Step 1: fail — clients select error", clientErr.message);
    return NextResponse.json({ error: clientErr.message }, { status: 400 });
  }

  const customerId = (client as { stripe_customer_id?: string | null } | null)?.stripe_customer_id?.trim() ?? "";
  const dbStatus = ((client as { subscription_status?: string | null } | null)?.subscription_status ?? "")
    .trim()
    .toLowerCase();

  console.log("[cancel-subscription] Step 1: client row", {
    userId: user.id,
    hasStripeCustomerId: Boolean(customerId),
    subscription_status: dbStatus,
  });

  if (dbStatus === "cancelled") {
    console.log("[cancel-subscription] Step 2: already cancelled in DB — short-circuit success");
    return NextResponse.json({ ok: true, message: "Already cancelled." });
  }

  if (dbStatus !== "active" && dbStatus !== "trial") {
    console.log("[cancel-subscription] Step 2: fail — DB status not cancellable", { dbStatus });
    return NextResponse.json(
      { error: "Only an active or trial subscription can be cancelled here." },
      { status: 400 },
    );
  }

  const setCancelledInDb = async (
    accessUntilIso: string | null,
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    console.log("[cancel-subscription] DB: updating subscription_status to cancelled", {
      userId: user.id,
      access_until: accessUntilIso,
    });
    const { error: updErr } = await admin
      .from("clients")
      .update({ subscription_status: "cancelled", access_until: accessUntilIso })
      .eq("id", user.id);
    if (updErr) {
      console.log("[cancel-subscription] DB: update failed", updErr.message);
      return { ok: false, message: updErr.message };
    }
    console.log("[cancel-subscription] DB: update succeeded");
    return { ok: true };
  };

  const stripe = getStripe();
  if (!customerId) {
    console.log("[cancel-subscription] Step 2: no stripe_customer_id — Supabase-only cancel");
    const r = await setCancelledInDb(null);
    if (!r.ok) {
      return NextResponse.json({ error: r.message }, { status: 500 });
    }
    await maybeSendWinbackEmail(admin, user.id);
    return NextResponse.json({ ok: true });
  }

  if (!stripe) {
    console.log("[cancel-subscription] Step 2: Stripe SDK not configured — Supabase-only cancel");
    const r = await setCancelledInDb(null);
    if (!r.ok) {
      return NextResponse.json({ error: r.message }, { status: 500 });
    }
    await maybeSendWinbackEmail(admin, user.id);
    return NextResponse.json({ ok: true });
  }

  try {
    console.log("[cancel-subscription] Step 3: listing active Stripe subscriptions", {
      customer: customerId,
    });

    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    console.log("[cancel-subscription] Step 3: list result", {
      count: list.data.length,
      subscriptionIds: list.data.map((s) => s.id),
    });

    const first = list.data.find(
      (s) => s.status === "trialing" || s.status === "active" || s.status === "past_due",
    );
    if (!first) {
      console.log(
        "[cancel-subscription] Step 4: no active Stripe subscription — updating Supabase only and returning success",
      );
      const r = await setCancelledInDb(null);
      if (!r.ok) {
        return NextResponse.json({ error: r.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const subscriptionId = first.id;
    console.log("[cancel-subscription] Step 4: set cancel_at_period_end in Stripe", { subscriptionId });

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    const updatedResp = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = ("data" in updatedResp ? updatedResp.data : updatedResp) as {
      id: string;
      status: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
    };
    const accessUntilIso =
      typeof updated.current_period_end === "number" && Number.isFinite(updated.current_period_end)
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null;
    console.log("[cancel-subscription] Step 5: Stripe update succeeded", {
      subscriptionId: updated.id,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end,
      access_until: accessUntilIso,
    });

    const r = await setCancelledInDb(accessUntilIso);
    if (!r.ok) {
      console.log(
        "[cancel-subscription] Step 6: fail — Stripe cancelled but DB update failed; user should contact support",
      );
      return NextResponse.json(
        {
          error:
            "Subscription was cancelled in Stripe, but we could not update your profile. Contact support.",
        },
        { status: 500 },
      );
    }

    console.log("[cancel-subscription] Step 6: success — Stripe + DB updated");

    await maybeSendWinbackEmail(admin, user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error.";
    console.log("[cancel-subscription] Stripe path threw", message, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
