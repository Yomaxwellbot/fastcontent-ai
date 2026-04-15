import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client.
 * Use this in React components (client components only).
 */
export function createClient() {
  // No extra options needed — @supabase/ssr already sets flowType:'pkce'
  // and cookie storage internally. Passing { auth } here overwrites storage.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
