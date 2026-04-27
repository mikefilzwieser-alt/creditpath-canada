import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAppliedPromoCode } from "@/lib/dashboard-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe-server";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendCheckoutWelcomeEmail(admin: SupabaseClient, userId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[stripe webhook] welcome email skipped: RESEND_API_KEY not set");
    return;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData?.user?.email) {
    console.warn("[stripe webhook] welcome email skipped: could not load user email", {
      userId,
      message: authErr?.message,
    });
    return;
  }

  const fullNameRaw =
    (typeof authData.user.user_metadata?.full_name === "string"
      ? authData.user.user_metadata.full_name.trim()
      : "") || "";

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  const greetingName = fullNameRaw ? escapeHtml(fullNameRaw) : "there";

  const html = `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
    <div style="background: #00C9A7; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Credit Path Canada</h1>
    </div>
    <div style="padding: 32px;">
      <p>Hi ${greetingName},</p>
      <p>You're officially enrolled in Canada's Credit Education Program — and your journey starts today.</p>
      <p>Over the next 12–24 months we're going to work together to strengthen your credit profile, month by month, with a clear personalized plan built specifically for you.</p>
      <p>Your first blueprint is ready. Log in anytime to see your Month 1 actions and track your progress.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="https://www.creditpathcanada.ca/dashboard" style="background: #00C9A7; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">View My Blueprint</a>
      </p>
      <p>If you have any questions at any point, reply to this email or reach out directly — we're with you every step of the way.</p>
      <p>— Michael Filzwieser<br>Founder, Credit Path Canada<br>(604) 442-0894</p>
    </div>
    <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
      Credit Path Canada · <a href="https://www.creditpathcanada.ca">creditpathcanada.ca</a>
    </div>
  </div>
`.trim();

  const { error } = await resend.emails.send({
    from,
    to: [authData.user.email.trim()],
    subject: "Welcome to Credit Path Canada",
    html,
  });

  if (error) {
    console.warn("[stripe webhook] welcome email send failed", {
      userId,
      message: typeof error.message === "string" ? error.message : JSON.stringify(error),
    });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server database not configured." }, { status: 503 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
        const customerRaw = session.customer;
        const customerId = typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
        if (userId && customerId) {
          let appliedPromoCode: string | undefined;
          const sessionObj = event.data.object as Stripe.Checkout.Session;
          const promoCodeId = (sessionObj as any).discounts?.[0]?.promotion_code;

          if (promoCodeId && typeof promoCodeId === "string") {
            const promoObj = await stripe.promotionCodes.retrieve(promoCodeId);
            appliedPromoCode = normalizeAppliedPromoCode(promoObj.code);
          }

          const updatePayload: {
            subscription_status: string;
            stripe_customer_id: string;
            access_until: string | null;
            applied_promo_code?: string;
          } = {
            subscription_status: "active",
            stripe_customer_id: customerId,
            access_until: null,
          };
          if (appliedPromoCode) {
            updatePayload.applied_promo_code = appliedPromoCode;
          }

          await admin.from("clients").update(updatePayload).eq("id", userId);
          if (appliedPromoCode && customerId) {
            await admin
              .from("clients")
              .update({ applied_promo_code: appliedPromoCode })
              .eq("stripe_customer_id", customerId);
          }
          void sendCheckoutWelcomeEmail(admin, userId).catch((err) => {
            console.warn("[stripe webhook] welcome email unexpected error", {
              userId,
              message: err instanceof Error ? err.message : String(err),
            });
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerRaw = sub.customer;
        const customerId = typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
        if (customerId) {
          await admin
            .from("clients")
            .update({ subscription_status: "inactive", access_until: null })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.status === "past_due" || sub.status === "unpaid") {
          const customerRaw = sub.customer;
          const customerId = typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
          if (customerId) {
            await admin
              .from("clients")
              .update({ subscription_status: "inactive", access_until: null })
              .eq("stripe_customer_id", customerId);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
