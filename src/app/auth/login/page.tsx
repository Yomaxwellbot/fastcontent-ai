"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/send-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to send code.");
    } else {
      setCodeSent(true);
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length < 4) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Verify the OTP code
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setError(error.message.includes("expired") || error.message.includes("invalid")
        ? "That code is invalid or expired. Request a new one."
        : error.message);
      setLoading(false);
      return;
    }

    const session = data?.session;
    if (!session) {
      setError("Verification succeeded but no session returned. Please request a new code.");
      setLoading(false);
      return;
    }

    // Relay tokens to server to set proper session cookies
    const exchangeRes = await fetch("/api/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    if (!exchangeRes.ok) {
      const errData = await exchangeRes.json();
      setError("Session setup failed: " + (errData.error || "unknown error"));
      setLoading(false);
      return;
    }

    // Server has session cookies — hard reload
    window.location.replace("/");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-400 mb-2">FastContent AI</h1>
          <p className="text-gray-400 text-sm">Login to start repurposing content</p>
        </div>

        {!codeSent ? (
          <form onSubmit={handleSendCode} className="bg-gray-900 rounded-2xl border border-gray-800 p-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>}
            <button type="submit" disabled={loading || !email.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-semibold transition-colors">
              {loading ? "Sending..." : "Send login code →"}
            </button>
            <p className="text-xs text-gray-500 text-center">We&apos;ll email you a login code.</p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="bg-gray-900 rounded-2xl border border-gray-800 p-8 space-y-4">
            <div className="text-center mb-2">
              <div className="text-3xl mb-3">📬</div>
              <p className="text-gray-300 text-sm">Code sent to <span className="text-white font-medium">{email}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Enter your login code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="········"
                required
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest font-mono"
              />
            </div>
            {error && <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>}
            <button type="submit" disabled={loading || code.length < 4}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-semibold transition-colors">
              {loading ? "Verifying..." : "Sign in →"}
            </button>
            <button type="button" onClick={() => { setCodeSent(false); setCode(""); setError(null); }}
              className="w-full text-sm text-gray-500 hover:text-gray-300">
              ← Use a different email
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-300">← Back to home</button>
        </div>
      </div>
    </main>
  );
}
