import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("generations")
      .select("id, input_text, output_types, results, tokens_used, created_at")
      .eq("user_id", user.id)
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[/api/generations] DB error:", error);
      return NextResponse.json(
        { error: "Failed to load generations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ generations: data });
  } catch (e: unknown) {
    console.error("[/api/generations] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
