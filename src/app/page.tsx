import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscriptionStatus = "free";
  let initialTokenUsage = undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "subscription_status, stripe_customer_id, tokens_used_this_period, token_limit, period_ends_at, period_started_at"
      )
      .eq("id", user.id)
      .single();

    subscriptionStatus = profile?.subscription_status ?? "free";

    // Fallback: if user just returned from checkout but webhook hasn't fired yet,
    // verify subscription directly with Stripe and update profile
    if (
      params?.upgraded === "true" &&
      profile?.stripe_customer_id &&
      subscriptionStatus !== "active"
    ) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          const periodStart = new Date(
            sub.current_period_start * 1000
          ).toISOString();
          const periodEnd = new Date(
            sub.current_period_end * 1000
          ).toISOString();

          await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
              subscription_id: sub.id,
              price_id: sub.items.data[0]?.price.id,
              period_started_at: periodStart,
              period_ends_at: periodEnd,
              current_period_end: periodEnd,
              tokens_used_this_period: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          subscriptionStatus = "active";
          initialTokenUsage = {
            tokens_used_this_period: 0,
            token_limit: profile.token_limit ?? 1000000,
            period_ends_at: periodEnd,
          };
        }
      } catch (e) {
        console.error("[page] Stripe fallback check failed:", e);
      }
    }

    if (
      !initialTokenUsage &&
      profile &&
      subscriptionStatus === "active"
    ) {
      initialTokenUsage = {
        tokens_used_this_period: profile.tokens_used_this_period ?? 0,
        token_limit: profile.token_limit ?? 1000000,
        period_ends_at: profile.period_ends_at,
      };
    }
  }

  return (
    <HomeClient
      user={user ? { id: user.id, email: user.email ?? "" } : null}
      subscriptionStatus={subscriptionStatus}
      initialTokenUsage={initialTokenUsage}
    />
  );
}
