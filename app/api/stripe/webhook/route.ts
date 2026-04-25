import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { CCVIP2026_PROMO_CODE, normalizeAppliedPromoCode } from "@/lib/dashboard-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe-server";

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
          let appliedPromoCode: string | undefined;
          const discountRefs = session.discounts;
          if (discountRefs?.length) {
            for (const d of discountRefs) {
              const ref = d.promotion_code;
              if (!ref) continue;
              const promoId = typeof ref === "string" ? ref : ref.id;
              try {
                const pc = await stripe.promotionCodes.retrieve(promoId);
                if (normalizeAppliedPromoCode(pc.code) === CCVIP2026_PROMO_CODE) {
                  appliedPromoCode = CCVIP2026_PROMO_CODE;
                  break;
                }
              } catch (e) {
                console.warn("[stripe webhook] promotion code retrieve failed", {
                  promoId,
                  message: e instanceof Error ? e.message : String(e),
                });
              }
            }
          }

          const updatePayload: {
            subscription_status: string;
            stripe_customer_id: string;
            applied_promo_code?: string;
          } = {
            subscription_status: "active",
            stripe_customer_id: customerId,
          };
          if (appliedPromoCode) {
            updatePayload.applied_promo_code = appliedPromoCode;
          }

          await admin.from("clients").update(updatePayload).eq("id", userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerRaw = sub.customer;
        const customerId = typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
        if (customerId) {
          await admin.from("clients").update({ subscription_status: "inactive" }).eq("stripe_customer_id", customerId);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.status === "past_due" || sub.status === "unpaid") {
          const customerRaw = sub.customer;
          const customerId = typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
          if (customerId) {
            await admin.from("clients").update({ subscription_status: "inactive" }).eq("stripe_customer_id", customerId);
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
