import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

// 5 magic link requests per IP per 15 minutes
const MAGIC_LINK_LIMIT = 5;
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP before doing anything else
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`magic_link:${ip}`, MAGIC_LINK_LIMIT, MAGIC_LINK_WINDOW_MS);

    if (!rl.allowed) {
      const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fastcontent.yomaxwell.space";
    const supabase = createAdminClient();

    // Generate token using admin client (bypasses Supabase email rate limits)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim().toLowerCase(),
    });

    if (error || !data?.properties?.action_link) {
      console.error("[send-magic-link] generateLink error:", error);
      return NextResponse.json(
        { error: "Failed to generate login link. Please try again." },
        { status: 500 }
      );
    }

    // Extract token directly from action_link URL — most reliable source
    const actionUrl = new URL(data.properties.action_link);
    const token_hash = actionUrl.searchParams.get("token");
    const tokenType = actionUrl.searchParams.get("type") ?? "magiclink";

    if (!token_hash) {
      console.error("[send-magic-link] No token in action_link:", data.properties.action_link);
      return NextResponse.json(
        { error: "Failed to generate login link. Please try again." },
        { status: 500 }
      );
    }

    // Build our own verify URL — server-side route sets cookies directly
    const verifyUrl = `${appUrl}/auth/verify?token_hash=${encodeURIComponent(token_hash)}&type=${tokenType}`;

    // Send via SendGrid with our custom template
    await sendMagicLinkEmail(email.trim().toLowerCase(), verifyUrl);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[send-magic-link] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
