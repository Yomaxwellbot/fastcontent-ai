import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client.
 * Use this in React components (client components only).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
