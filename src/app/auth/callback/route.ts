import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Only allow relative paths for the next param — prevents open redirect */
function safeNext(next: string | null): string {
  if (!next) return "/";
  // Must start with / and not contain protocol or double-slash
  if (/^\/(?!\/)[^\s]*$/.test(next)) return next;
  return "/";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Log server-side only — don't expose Supabase error details in URL
    console.error("[auth/callback] exchangeCodeForSession error:", error.message, error.status);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
