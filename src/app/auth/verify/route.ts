import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /auth/verify?token_hash=xxx&type=magiclink
 *
 * Server-side OTP verification — no implicit flow, no hash tokens in browser.
 * verifyOtp() sets the session and triggers setAll() which writes cookies.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "magiclink";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fastcontent.yomaxwell.space";

  if (!token_hash) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=missing_token`);
  }

  const response = NextResponse.redirect(appUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
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

  // Try magiclink type first, fall back to email
  let result = await supabase.auth.verifyOtp({
    token_hash,
    type: "magiclink",
  });

  if (result.error) {
    result = await supabase.auth.verifyOtp({
      token_hash,
      type: "email",
    });
  }

  if (result.error) {
    console.error("[auth/verify] verifyOtp error:", result.error.message, result.error.status);
    return NextResponse.redirect(
      `${appUrl}/auth/login?error=auth_callback_failed&detail=${encodeURIComponent(result.error.message)}`
    );
  }

  // Session is set — cookies are written to response — redirect to app
  return response;
}
