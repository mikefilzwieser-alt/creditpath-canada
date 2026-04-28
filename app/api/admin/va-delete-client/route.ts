import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe-server";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

const SUCCESS_MESSAGE = "Client fully deleted from Supabase and Stripe";

async function deleteClientAndChildren(admin: SupabaseClient, clientId: string): Promise<{ error: string | null }> {
  const { error: e1 } = await admin.from("action_completions").delete().eq("client_id", clientId);
  if (e1) return { error: `action_completions: ${e1.message}` };

  const { error: e2 } = await admin.from("monthly_plans").delete().eq("client_id", clientId);
  if (e2) return { error: `monthly_plans: ${e2.message}` };

  const { error: e3 } = await admin.from("monthly_uploads").delete().eq("client_id", clientId);
  if (e3) return { error: `monthly_uploads: ${e3.message}` };

  const { error: e4 } = await admin.from("blueprints").delete().eq("client_id", clientId);
  if (e4) return { error: `blueprints: ${e4.message}` };

  const { error: e5 } = await admin.from("goals").delete().eq("client_id", clientId);
  if (e5) return { error: `goals: ${e5.message}` };

  const { error: e6 } = await admin.from("clients").delete().eq("id", clientId);
  if (e6) return { error: `clients: ${e6.message}` };

  return { error: null };
}

type Body = {
  portal_password?: string;
  client_id?: string;
};

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
    .select("stripe_customer_id")
    .eq("id", clientId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: `Could not load client: ${fetchErr.message}` }, { status: 400 });
  }
  if (!clientRow) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const stripeCustomerIdRaw = (clientRow as { stripe_customer_id?: string | null }).stripe_customer_id;
  const stripeCustomerId =
    typeof stripeCustomerIdRaw === "string" && stripeCustomerIdRaw.trim() ? stripeCustomerIdRaw.trim() : "";

  const { error: cascadeErr } = await deleteClientAndChildren(admin, clientId);
  if (cascadeErr) {
    return NextResponse.json({ error: cascadeErr }, { status: 400 });
  }

  const { error: delUserErr } = await admin.auth.admin.deleteUser(clientId);
  if (delUserErr) {
    return NextResponse.json({ error: `Auth user delete failed: ${delUserErr.message}` }, { status: 502 });
  }

  if (stripeCustomerId) {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured; Stripe customer was not deleted." },
        { status: 503 },
      );
    }
    try {
      await stripe.customers.del(stripeCustomerId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Stripe customer delete failed: ${msg}` }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
}
