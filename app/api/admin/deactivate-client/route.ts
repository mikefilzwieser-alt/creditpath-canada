import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe-server";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

type Body = {
  portal_password?: string;
  client_id?: string;
};

type ClientRow = {
  stripe_customer_id: string | null;
  subscription_status: string | null;
  deactivated_at: string | null;
};

async function cancelStripeSubscriptionForClient(
  admin: SupabaseClient,
  clientId: string,
  customerId: string,
): Promise<{ ok: true; accessUntilIso: string | null } | { ok: false; message: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, message: "Stripe is not configured on the server." };
  }

  try {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const first = list.data.find(
      (s) => s.status === "trialing" || s.status === "active" || s.status === "past_due",
    );

    if (!first) {
      const { error: updErr } = await admin
        .from("clients")
        .update({ subscription_status: "cancelled", access_until: null })
        .eq("id", clientId);
      if (updErr) return { ok: false, message: updErr.message };
      return { ok: true, accessUntilIso: null };
    }

    await stripe.subscriptions.update(first.id, {
      cancel_at_period_end: true,
    });

    const updatedResp = await stripe.subscriptions.retrieve(first.id);
    const updated = ("data" in updatedResp ? updatedResp.data : updatedResp) as {
      current_period_end?: number;
    };
    const accessUntilIso =
      typeof updated.current_period_end === "number" && Number.isFinite(updated.current_period_end)
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null;

    const { error: updErr } = await admin
      .from("clients")
      .update({ subscription_status: "cancelled", access_until: accessUntilIso })
      .eq("id", clientId);
    if (updErr) {
      return {
        ok: false,
        message: `Subscription was cancelled in Stripe, but the client record could not be updated: ${updErr.message}`,
      };
    }

    return { ok: true, accessUntilIso };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error.";
    return { ok: false, message };
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isValidVaPortalPassword(body.portal_password)) {
    return NextResponse.json({ error: "Invalid VA portal password." }, { status: 401 });
  }

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for admin database access." }, { status: 503 });
  }

  const { data: clientRow, error: fetchErr } = await admin
    .from("clients")
    .select("stripe_customer_id, subscription_status, deactivated_at")
    .eq("id", clientId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: `Could not load client: ${fetchErr.message}` }, { status: 400 });
  }
  if (!clientRow) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const row = clientRow as ClientRow;
  if (row.deactivated_at) {
    return NextResponse.json({ ok: true, message: "Client is already deactivated." });
  }

  const customerId = (row.stripe_customer_id ?? "").trim();
  const dbStatus = (row.subscription_status ?? "").trim().toLowerCase();

  if (customerId && (dbStatus === "active" || dbStatus === "trial")) {
    const cancelResult = await cancelStripeSubscriptionForClient(admin, clientId, customerId);
    if (!cancelResult.ok) {
      return NextResponse.json({ error: cancelResult.message }, { status: 502 });
    }
  } else if (dbStatus === "active" || dbStatus === "trial") {
    const { error: updErr } = await admin
      .from("clients")
      .update({ subscription_status: "cancelled", access_until: null })
      .eq("id", clientId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  const deactivatedAt = new Date().toISOString();
  const { error: deactivateErr } = await admin
    .from("clients")
    .update({ deactivated_at: deactivatedAt })
    .eq("id", clientId);

  if (deactivateErr) {
    return NextResponse.json(
      { error: `Could not set deactivated_at: ${deactivateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Client deactivated. Subscription cancelled where applicable; data retained.",
    deactivated_at: deactivatedAt,
  });
}
