import { headers } from "next/headers";
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

/**
 * Resolves the customer-facing promotion code from a completed Checkout Session.
 * Uses an expanded retrieve so `total_details.breakdown.discounts` and top-level `discounts`
 * include nested `promotion_code` objects when present.
 */
async function extractCheckoutSessionPromoCode(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  async function codeFromPromotionCodeRef(
    ref: string | Stripe.PromotionCode | null | undefined,
  ): Promise<string | null> {
    if (ref == null) return null;
    if (typeof ref === "object" && typeof ref.code === "string" && ref.code.trim()) {
      return normalizeAppliedPromoCode(ref.code);
    }
    const id =
      typeof ref === "string"
        ? ref
        : typeof ref === "object" && ref && "id" in ref && typeof (ref as { id?: unknown }).id === "string"
          ? (ref as { id: string }).id
          : null;
    if (!id) return null;
    try {
      const pc = await stripe.promotionCodes.retrieve(id);
      return pc.code ? normalizeAppliedPromoCode(pc.code) : null;
    } catch (e) {
      console.warn("[stripe webhook] promotionCodes.retrieve failed", {
        promotionCodeId: id,
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  }

  let full: Stripe.Checkout.Session = session;
  try {
    full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: [
        "discounts.promotion_code",
        "total_details.breakdown.discounts.discount",
        "total_details.breakdown.discounts.discount.promotion_code",
      ],
    });
  } catch (e) {
    console.warn("[stripe webhook] checkout.sessions.retrieve (promo expand) failed", {
      sessionId: session.id,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  const seen = new Set<string>();
  const takeFirst = (code: string | null): string | null => {
    if (!code) return null;
    if (seen.has(code)) return null;
    seen.add(code);
    return code;
  };

  if (full.discounts?.length) {
    for (const d of full.discounts) {
      const c = await codeFromPromotionCodeRef(d.promotion_code);
      const t = takeFirst(c);
      if (t) return t;
    }
  }

  const breakdownDiscounts = full.total_details?.breakdown?.discounts;
  if (breakdownDiscounts?.length) {
    for (const row of breakdownDiscounts) {
      const disc = row.discount;
      if (!disc || typeof disc === "string") continue;
      const billingDiscount = disc as unknown as Stripe.Discount;
      const c = await codeFromPromotionCodeRef(billingDiscount.promotion_code);
      const t = takeFirst(c);
      if (t) return t;
    }
  }

  return null;
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

  const body = await request.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
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
          const appliedPromoCode = await extractCheckoutSessionPromoCode(stripe, session);

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
