import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Excluded from middleware — receives tokens from browser verifyOtp,
// sets proper server-side session cookies, redirects to /.
export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fastcontent.yomaxwell.space";

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
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
    console.error("[exchange] setSession error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return response;
}
