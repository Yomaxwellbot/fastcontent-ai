import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/HomeClient";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let subscriptionStatus = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();
    subscriptionStatus = profile?.subscription_status ?? "free";
  }

  return (
    <HomeClient
      user={user ? { id: user.id, email: user.email ?? "" } : null}
      subscriptionStatus={subscriptionStatus}
    />
  );
}
