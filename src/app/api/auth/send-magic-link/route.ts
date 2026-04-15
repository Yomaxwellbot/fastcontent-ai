import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fastcontent.yomaxwell.space";
    const supabase = createAdminClient();

    // Generate the magic link using admin client (bypasses Supabase email rate limits)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[send-magic-link] generateLink error:", error);
      return NextResponse.json(
        { error: "Failed to generate login link. Please try again." },
        { status: 500 }
      );
    }

    // Send via SendGrid with our custom template
    await sendMagicLinkEmail(email.trim().toLowerCase(), data.properties.action_link);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[send-magic-link] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
