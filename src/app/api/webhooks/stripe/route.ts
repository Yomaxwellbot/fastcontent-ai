import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function getProfileByStripeCustomer(customerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, period_started_at")
    .eq("stripe_customer_id", customerId)
    .single();
  return data;
}

async function updateProfile(
  userId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[webhook] Failed to update profile:", error);
  }
}

function handleSubscriptionPeriod(
  subscription: Stripe.Subscription,
  existingPeriodStart: string | null
) {
  const periodStart = new Date(
    subscription.current_period_start * 1000
  ).toISOString();
  const periodEnd = new Date(
    subscription.current_period_end * 1000
  ).toISOString();

  // Only reset tokens if this is a new period (period_start changed)
  const isRenewal =
    !existingPeriodStart || periodStart !== existingPeriodStart;

  const updates: Record<string, unknown> = {
    period_started_at: periodStart,
    period_ends_at: periodEnd,
    current_period_end: periodEnd,
  };

  if (isRenewal) {
    updates.tokens_used_this_period = 0;
  }

  return updates;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      const profile = await getProfileByStripeCustomer(customerId);

      if (profile) {
        const periodUpdates = handleSubscriptionPeriod(
          subscription,
          profile.period_started_at
        );
        await updateProfile(profile.id, {
          subscription_status: "active",
          subscription_id: subscriptionId,
          price_id: subscription.items.data[0]?.price.id,
          ...periodUpdates,
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const profile = await getProfileByStripeCustomer(
        subscription.customer as string
      );

      if (profile) {
        const periodUpdates = handleSubscriptionPeriod(
          subscription,
          profile.period_started_at
        );
        await updateProfile(profile.id, {
          subscription_status:
            subscription.status === "active"
              ? "active"
              : subscription.status,
          ...periodUpdates,
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // Only handle subscription renewals (not first payment)
      if (
        invoice.billing_reason === "subscription_cycle" &&
        invoice.subscription
      ) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        const profile = await getProfileByStripeCustomer(
          invoice.customer as string
        );

        if (profile) {
          const periodUpdates = handleSubscriptionPeriod(
            subscription,
            profile.period_started_at
          );
          await updateProfile(profile.id, {
            subscription_status: "active",
            ...periodUpdates,
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const profile = await getProfileByStripeCustomer(
        subscription.customer as string
      );

      if (profile) {
        // Don't zero out tokens — let user use what's left until period ends
        await updateProfile(profile.id, {
          subscription_status: "cancelled",
          subscription_id: null,
          price_id: null,
        });
      }
      break;
    }

    default:
      console.log(`[webhook] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
