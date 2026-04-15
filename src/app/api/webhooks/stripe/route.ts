import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Disable body parsing — Stripe needs the raw body to verify the signature
export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[webhook] Failed to update profile:", error);
  }
}

async function getProfileByStripeCustomer(customerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data;
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

      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const profile = await getProfileByStripeCustomer(customerId);

      if (profile) {
        await updateProfile(profile.id, {
          subscription_status: "active",
          subscription_id: subscriptionId,
          price_id: subscription.items.data[0]?.price.id,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const profile = await getProfileByStripeCustomer(subscription.customer as string);

      if (profile) {
        await updateProfile(profile.id, {
          subscription_status: subscription.status === "active" ? "active" : subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const profile = await getProfileByStripeCustomer(subscription.customer as string);

      if (profile) {
        await updateProfile(profile.id, {
          subscription_status: "free",
          subscription_id: null,
          price_id: null,
          current_period_end: null,
        });
      }
      break;
    }

    default:
      console.log(`[webhook] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
