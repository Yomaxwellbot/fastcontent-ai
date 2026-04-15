import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /api/auth/exchange?access_token=xxx&refresh_token=yyy
 *
 * Called from the client callback page with tokens parsed from the hash.
 * Sets proper HTTP session cookies and redirects to /.
 * Excluded from middleware so cookies are not overwritten.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fastcontent.yomaxwell.space";

  if (!access_token || !refresh_token) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=missing_tokens`);
  }

  // Create redirect response first — we'll attach cookies to it
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
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });

  if (error) {
    console.error("[auth/exchange] setSession error:", error.message);
    return NextResponse.redirect(`${appUrl}/auth/login?error=auth_callback_failed`);
  }

  return response;
}
