import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe";

type OutputType = "twitter" | "linkedin" | "newsletter";

interface GenerateRequest {
  text: string;
  outputTypes: OutputType[];
}

function buildPrompt(text: string, outputType: OutputType): string {
  const base = `You are an expert content strategist. Transform the following content into platform-optimized material.\n\nORIGINAL CONTENT:\n${text}\n\n`;

  switch (outputType) {
    case "twitter":
      return (
        base +
        `Create a Twitter thread (8-12 tweets) that:
- Opens with a hook tweet that stops the scroll
- Breaks down the key ideas into bite-sized tweets
- Each tweet is max 280 characters
- Uses line breaks for readability
- Ends with a CTA tweet
- Numbers each tweet (1/, 2/, etc.)
Format: just the tweets, numbered, one per line.`
      );

    case "linkedin":
      return (
        base +
        `Create a LinkedIn post that:
- Opens with a bold, thought-provoking first line (no "I" as the first word)
- Uses short paragraphs (1-3 lines each)
- Includes a key insight or contrarian take
- Ends with a question to drive comments
- Total length: 150-300 words
- No hashtags
Format: just the post text, ready to copy-paste.`
      );

    case "newsletter":
      return (
        base +
        `Create a newsletter section that includes:
1. Subject line (compelling, under 50 chars)
2. Preview text (teaser, under 90 chars)
3. Body content (300-500 words, conversational tone, 2-4 short sections)
4. One call-to-action at the end
Format: clearly labeled sections (Subject:, Preview:, Body:, CTA:).`
      );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    // Get user's profile / subscription status
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, email")
      .eq("id", user.id)
      .single();

    const isPro = profile?.subscription_status === "active";

    // Rate limiting for free users
    if (!isPro) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);

      if ((count ?? 0) >= PLANS.free.generationsPerHour) {
        return NextResponse.json(
          {
            error: "Free tier limit reached (3/hour). Upgrade to Pro for unlimited generations.",
            upgradeRequired: true,
          },
          { status: 429 }
        );
      }
    }

    // Validate input
    const body: GenerateRequest = await req.json();
    const { text, outputTypes } = body;

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Please provide at least 50 characters of content to repurpose." },
        { status: 400 }
      );
    }

    if (!outputTypes || !Array.isArray(outputTypes) || outputTypes.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one output type." },
        { status: 400 }
      );
    }

    const trimmedText = text.slice(0, 5000);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    // Generate in parallel
    const generations = await Promise.all(
      outputTypes.map(async (type) => {
        const prompt = buildPrompt(trimmedText, type);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? `AI generation failed for ${type}`);
        }

        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return { type, content };
      })
    );

    // Build results
    const results: Partial<Record<OutputType, string>> = {};
    for (const { type, content } of generations) {
      results[type] = content;
    }

    // Save generation to DB
    await supabase.from("generations").insert({
      user_id: user.id,
      input_text: trimmedText,
      output_types: outputTypes,
      results,
    });

    // Generation count is tracked via the generations table itself

    return NextResponse.json({ results });
  } catch (e: unknown) {
    console.error("[/api/generate] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
