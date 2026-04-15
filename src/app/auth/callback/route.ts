import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(appUrl);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error.message);

    // Code already used or expired — send to login with helpful message
    const expired = error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("already");
    return NextResponse.redirect(`${appUrl}/auth/login?error=${expired ? "link_expired" : "auth_callback_failed"}`);
  }

  return NextResponse.redirect(`${appUrl}/auth/login?error=auth_callback_failed`);
}
