import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/email";
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

    const supabase = createAdminClient();

    // Generate OTP — admin.generateLink returns email_otp (the 6-digit code)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim().toLowerCase(),
    });

    if (error || !data?.properties?.email_otp) {
      console.error("[send-otp] generateLink error:", error);
      return NextResponse.json({ error: "Failed to generate code." }, { status: 500 });
    }

    // Send our own email with just the 6-digit code — no magic link confusion
    await sendOtpEmail(email.trim().toLowerCase(), data.properties.email_otp);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[send-otp] Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
