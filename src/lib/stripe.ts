import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
  typescript: true,
});

// Price ID for the $19/mo plan — set this in env vars after creating the product in Stripe
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    generationsPerHour: 3,
  },
  pro: {
    name: "Pro",
    price: 19,
    generationsPerHour: Infinity,
  },
} as const;

export type PlanType = keyof typeof PLANS;
