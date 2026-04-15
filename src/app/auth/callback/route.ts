import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fastcontent.yomaxwell.space";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=auth_callback_failed`);
  }

  // Build the redirect response first — session cookies go directly on it
  const response = NextResponse.redirect(appUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read PKCE code verifier from the incoming request cookies
        getAll() {
          return request.cookies.getAll();
        },
        // Write new session tokens directly onto the redirect response
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(
              name,
              value,
              options as Parameters<typeof response.cookies.set>[2]
            );
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    const expired = error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("already");
    return NextResponse.redirect(
      `${appUrl}/auth/login?error=${expired ? "link_expired" : "auth_callback_failed"}`
    );
  }

  // Session cookies are on the response — browser stores them before following redirect
  return response;
}
