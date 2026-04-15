"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthButton from "./AuthButton";

type OutputType = "twitter" | "linkedin" | "newsletter";

interface GeneratedContent {
  twitter?: string;
  newsletter?: string;
  linkedin?: string;
}

interface Generation {
  id: string;
  input_text: string;
  output_types: string[];
  results: GeneratedContent;
  tokens_used: number | null;
  created_at: string;
}

interface TokenUsage {
  tokens_used_this_request?: number;
  tokens_used_this_period: number;
  token_limit: number;
  period_ends_at: string | null;
}

interface UserInfo {
  id: string;
  email: string;
}

interface Props {
  user: UserInfo | null;
  subscriptionStatus: string;
  initialTokenUsage?: {
    tokens_used_this_period: number;
    token_limit: number;
    period_ends_at: string | null;
  };
}

const OUTPUT_OPTIONS: { id: OutputType; label: string; description: string }[] =
  [
    {
      id: "twitter",
      label: "Twitter Thread",
      description: "10-tweet thread optimized for engagement",
    },
    {
      id: "linkedin",
      label: "LinkedIn Post",
      description: "Professional post with hooks & insights",
    },
    {
      id: "newsletter",
      label: "Newsletter Draft",
      description: "Email-ready section with subject line",
    },
  ];

export default function HomeClient({
  user,
  subscriptionStatus,
  initialTokenUsage,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [selectedOutputs, setSelectedOutputs] = useState<OutputType[]>([
    "twitter",
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<Generation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(
    initialTokenUsage
      ? {
          tokens_used_this_period:
            initialTokenUsage.tokens_used_this_period,
          token_limit: initialTokenUsage.token_limit,
          period_ends_at: initialTokenUsage.period_ends_at,
        }
      : null
  );
  const [lastRequestTokens, setLastRequestTokens] = useState<number | null>(
    null
  );
  const [showTokenTooltip, setShowTokenTooltip] = useState(false);
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  const isPro = subscriptionStatus === "active";

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/generations");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.generations || []);
      }
    } catch {
      // non-critical
    }
  };

  const toggleOutput = (type: OutputType) => {
    setSelectedOutputs((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!inputText.trim() || selectedOutputs.length === 0) return;
    setLoading(true);
    setError(null);
    setLastRequestTokens(null);

    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, outputTypes: selectedOutputs }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Your session expired. Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 1500);
        return;
      }

      if (res.status === 402 && data.upgradeRequired) {
        setError(data.message);
        return;
      }

      if (res.status === 429) {
        if (data.error === "token_limit_reached") {
          setTokenUsage({
            tokens_used_this_period: data.used,
            token_limit: data.limit,
            period_ends_at: data.reset_date,
          });
        }
        setError(data.message || data.error);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResults(data.results);
      setActiveHistoryId(null);

      // Update token usage from response
      if (data.tokens_used_this_period !== undefined) {
        setTokenUsage({
          tokens_used_this_request: data.tokens_used_this_request,
          tokens_used_this_period: data.tokens_used_this_period,
          token_limit: data.token_limit,
          period_ends_at: data.period_ends_at,
        });
        setLastRequestTokens(data.tokens_used_this_request);
      }

      loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to start checkout. Please try again.");
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/billing", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to open billing portal.");
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const viewGeneration = (gen: Generation) => {
    setResults(gen.results);
    setActiveHistoryId(gen.id);
    setError(null);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // Token usage helpers
  const usagePercent = tokenUsage
    ? Math.min(
        100,
        (tokenUsage.tokens_used_this_period / tokenUsage.token_limit) * 100
      )
    : 0;
  const tokensRemaining = tokenUsage
    ? tokenUsage.token_limit - tokenUsage.tokens_used_this_period
    : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-400">
              FastContent AI
            </h1>
            <p className="text-xs text-gray-500">
              by Maxwell · repurpose anything, instantly
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {isPro && (
                  <span className="text-xs px-2 py-1 rounded-full border border-indigo-500/30 text-indigo-400">
                    PRO
                  </span>
                )}
                <AuthButton email={user.email} />
              </>
            ) : (
              <a
                href="/auth/login"
                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg px-4 py-2 transition-colors"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero — different for logged-out vs logged-in */}
      {!user && (
        <section className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-4xl font-bold mb-4">
            One article.{" "}
            <span className="text-indigo-400">Three platforms.</span> Ten
            seconds.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-2">
            Paste your content and get a Twitter thread, LinkedIn post, and
            newsletter draft — all tailored for each platform, ready to copy and
            paste.
          </p>
          <p className="text-indigo-400 font-semibold text-lg">
            $6/month — 1 million tokens of AI content generation
          </p>
          <p className="text-gray-500 text-sm mt-1">
            300+ social posts per month · Powered by Gemini 2.5 Flash
          </p>
        </section>
      )}

      {/* Token Usage Bar (pro users) */}
      {user && isPro && tokenUsage && (
        <section className="max-w-4xl mx-auto px-6 pt-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-white">
                    {tokenUsage.tokens_used_this_period.toLocaleString()}
                  </span>{" "}
                  of {tokenUsage.token_limit.toLocaleString()} tokens used
                </p>
                <div className="relative">
                  <button
                    onClick={() => setShowTokenTooltip(!showTokenTooltip)}
                    className="text-gray-500 hover:text-gray-400 text-xs"
                    aria-label="Token info"
                  >
                    ⓘ
                  </button>
                  {showTokenTooltip && (
                    <div className="absolute left-0 top-6 z-10 w-72 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 shadow-lg">
                      1,000,000 tokens ≈ 750,000 words ≈ 300-500 typical posts.
                      Most users use under 100,000 per month.
                      <button
                        onClick={() => setShowTokenTooltip(false)}
                        className="block mt-2 text-indigo-400"
                      >
                        Got it
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {tokenUsage.period_ends_at && (
                  <span className="text-xs text-gray-500">
                    Resets{" "}
                    {new Date(tokenUsage.period_ends_at).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
                <button
                  onClick={handleManageBilling}
                  className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Manage billing →
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent >= 95
                    ? "bg-red-500"
                    : usagePercent >= 80
                      ? "bg-yellow-500"
                      : "bg-indigo-500"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            {/* Last generation token count */}
            {lastRequestTokens !== null && (
              <p className="text-xs text-gray-500 mt-2">
                Last generation used {lastRequestTokens.toLocaleString()} tokens
              </p>
            )}
          </div>

          {/* Warning banners */}
          {usagePercent >= 100 && (
            <div className="mt-3 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              Token limit reached. Resets{" "}
              {tokenUsage.period_ends_at
                ? new Date(tokenUsage.period_ends_at).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )
                : "next billing cycle"}
              .
            </div>
          )}
          {usagePercent >= 95 && usagePercent < 100 && (
            <div className="mt-3 bg-orange-900/30 border border-orange-700 rounded-lg px-4 py-3 text-orange-300 text-sm">
              Almost out of tokens —{" "}
              {tokensRemaining.toLocaleString()} remaining this month.
            </div>
          )}
          {usagePercent >= 80 && usagePercent < 95 && (
            <div className="mt-3 bg-yellow-900/30 border border-yellow-700 rounded-lg px-4 py-3 text-yellow-300 text-sm">
              {tokensRemaining.toLocaleString()} tokens remaining this month.
            </div>
          )}
        </section>
      )}

      {/* Upgrade prompt for non-subscribers */}
      {user && !isPro && (
        <section className="max-w-4xl mx-auto px-6 py-6">
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Subscribe to start generating
            </h3>
            <p className="text-gray-400 text-sm mb-1">
              $6/month — 1 million tokens of AI content generation
            </p>
            <p className="text-gray-500 text-xs mb-4">
              300+ social posts per month · Powered by Gemini 2.5 Flash
            </p>
            <button
              onClick={handleUpgrade}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Subscribe — $6/mo
            </button>
          </div>
        </section>
      )}

      {/* Main Tool */}
      <section className="max-w-4xl mx-auto px-6 pb-8 pt-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-6">
          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your content
            </label>
            <textarea
              className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Paste a blog post, YouTube transcript, article, or any content you want to repurpose..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              {inputText.length} characters
            </p>
          </div>

          {/* Output toggles */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              What do you need?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {OUTPUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleOutput(opt.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedOutputs.includes(opt.id)
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs mt-1 opacity-70">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={
              loading || !inputText.trim() || selectedOutputs.length === 0
            }
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
          >
            {loading
              ? "Generating..."
              : user
                ? isPro
                  ? "Generate Content →"
                  : "Subscribe to Generate →"
                : "Sign in to Generate →"}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
              {!isPro && user && (
                <button
                  onClick={handleUpgrade}
                  className="ml-2 underline text-indigo-400 hover:text-indigo-300"
                >
                  Subscribe now
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div ref={resultsRef} className="mt-8 space-y-6">
            {lastRequestTokens !== null && (
              <p className="text-xs text-gray-500 text-right">
                This generation used {lastRequestTokens.toLocaleString()} tokens
              </p>
            )}
            {results.twitter && (
              <ResultCard
                title="Twitter Thread"
                content={results.twitter}
                id="twitter"
                copied={copied}
                onCopy={handleCopy}
              />
            )}
            {results.linkedin && (
              <ResultCard
                title="LinkedIn Post"
                content={results.linkedin}
                id="linkedin"
                copied={copied}
                onCopy={handleCopy}
              />
            )}
            {results.newsletter && (
              <ResultCard
                title="Newsletter Draft"
                content={results.newsletter}
                id="newsletter"
                copied={copied}
                onCopy={handleCopy}
              />
            )}
          </div>
        )}
      </section>

      {/* Generation History */}
      {user && history.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors mb-4"
          >
            <span>{showHistory ? "▼" : "▶"}</span>
            <span>Recent generations ({history.length})</span>
          </button>

          {showHistory && (
            <div className="space-y-2">
              {history.map((gen) => (
                <button
                  key={gen.id}
                  onClick={() => viewGeneration(gen)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    activeHistoryId === gen.id
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-2">
                      {gen.output_types.map((type) => (
                        <span
                          key={type}
                          className="text-[10px] uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      {gen.tokens_used && (
                        <span className="text-[10px] text-gray-600">
                          {gen.tokens_used.toLocaleString()} tokens
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(gen.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 truncate">
                    {gen.input_text.slice(0, 120)}
                    {gen.input_text.length > 120 ? "..." : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-xs text-gray-600">
        FastContent AI is built and run by{" "}
        <a
          href="https://x.com/YoMaxwellAi"
          className="text-indigo-400 hover:underline"
        >
          Maxwell
        </a>{" "}
        — an AI bootstrapping a business with $200. Follow the journey.
      </footer>
    </main>
  );
}

function ResultCard({
  title,
  content,
  id,
  copied,
  onCopy,
}: {
  title: string;
  content: string;
  id: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <button
          onClick={() => onCopy(content, id)}
          className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg px-3 py-1.5 transition-colors"
        >
          {copied === id ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}
