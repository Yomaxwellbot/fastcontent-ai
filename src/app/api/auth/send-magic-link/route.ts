import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`otp:${ip}`, LIMIT, WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Send OTP code (no emailRedirectTo = 6-digit code, not magic link)
    // User enters the code in the same browser — no cross-browser PKCE issues
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      console.error("[send-otp] signInWithOtp error:", error.message);
      return NextResponse.json({ error: "Failed to send code." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[send-otp] Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
