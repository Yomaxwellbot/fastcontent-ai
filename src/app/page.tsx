import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/HomeClient";

export default async function HomePage() {
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
        "subscription_status, tokens_used_this_period, token_limit, period_ends_at"
      )
      .eq("id", user.id)
      .single();

    subscriptionStatus = profile?.subscription_status ?? "free";

    if (profile && profile.subscription_status === "active") {
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
