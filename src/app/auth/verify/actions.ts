"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export async function verifyTokenAction(token_hash: string, type: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        },
      },
    }
  );

  // Try both types — Supabase sometimes classifies differently
  let result = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "magiclink" | "email",
  });

  if (result.error && type !== "email") {
    result = await supabase.auth.verifyOtp({ token_hash, type: "email" });
  }

  if (result.error) {
    console.error("[verifyTokenAction] error:", result.error.message);
    redirect(`/auth/login?error=auth_callback_failed&detail=${encodeURIComponent(result.error.message)}`);
  }

  redirect("/");
}
