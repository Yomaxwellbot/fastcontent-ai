import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
  typescript: true,
});

// Price ID for the $6/mo token-based plan
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;

export const TOKEN_LIMIT = 1_000_000;
export const TOKEN_LIMIT_FORMATTED = "1,000,000";

export const PLAN = {
  name: "Pro",
  price: 6,
  tokenLimit: TOKEN_LIMIT,
} as const;
