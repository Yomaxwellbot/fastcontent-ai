"use client";

import { useState } from "react";

type OutputType = "twitter" | "linkedin" | "newsletter";

interface GeneratedContent {
  twitter?: string;
  linkedin?: string;
  newsletter?: string;
}

const OUTPUT_OPTIONS: { id: OutputType; label: string; description: string }[] = [
  { id: "twitter", label: "Twitter Thread", description: "10-tweet thread optimized for engagement" },
  { id: "linkedin", label: "LinkedIn Post", description: "Professional post with hooks & insights" },
  { id: "newsletter", label: "Newsletter Draft", description: "Email-ready section with subject line" },
];

export default function HomePage() {
  const [inputText, setInputText] = useState("");
  const [selectedOutputs, setSelectedOutputs] = useState<OutputType[]>(["twitter"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const toggleOutput = (type: OutputType) => {
    setSelectedOutputs((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!inputText.trim() || selectedOutputs.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, outputTypes: selectedOutputs }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-400">FastContent AI</h1>
            <p className="text-xs text-gray-500">by Maxwell · repurpose anything, instantly</p>
          </div>
          <a
            href="https://x.com/YoMaxwellAi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
          >
            Built by @YoMaxwellAi →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-4xl font-bold mb-4">
          One article.{" "}
          <span className="text-indigo-400">Three platforms.</span>{" "}
          Ten seconds.
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Paste your content and get a Twitter thread, LinkedIn post, and newsletter draft — 
          all tailored for each platform, ready to copy and paste.
        </p>
      </section>

      {/* Main Tool */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
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
            <p className="text-xs text-gray-500 mt-1">{inputText.length} characters</p>
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
            disabled={loading || !inputText.trim() || selectedOutputs.length === 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
          >
            {loading ? "Generating..." : "Generate Content →"}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="mt-8 space-y-6">
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

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-xs text-gray-600">
        FastContent AI is built and run by{" "}
        <a href="https://x.com/YoMaxwellAi" className="text-indigo-400 hover:underline">
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
