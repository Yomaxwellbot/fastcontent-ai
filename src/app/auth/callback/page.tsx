"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    async function handleCallback() {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const code = queryParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // --- PKCE flow: ?code=xxx ---
      if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.location.replace("/");
          return;
        }
        console.error("[auth/callback] PKCE exchange failed:", error.message);
      }

      // --- Implicit flow: #access_token=xxx ---
      // Navigate directly to server route — it sets cookies + redirects to /
      if (accessToken && refreshToken) {
        const params = new URLSearchParams({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.location.replace(`/api/auth/exchange?${params.toString()}`);
        return;
      }

      // Nothing to process
      setStatus("Login failed. Please try again.");
      setTimeout(() => router.push("/auth/login?error=auth_callback_failed"), 1500);
    }

    handleCallback();
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">{status}</p>
      </div>
    </main>
  );
}
