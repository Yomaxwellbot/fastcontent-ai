"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      // Handle PKCE flow: ?code=xxx
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("Login failed. Please try again.");
          setTimeout(() => router.push("/auth/login?error=auth_callback_failed"), 1500);
          return;
        }
      }

      // Handle implicit flow: #access_token=xxx
      // Supabase JS client automatically picks up hash tokens on getSession()
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        setStatus("Logged in! Redirecting...");
        router.push("/");
        router.refresh();
        return;
      }

      // Nothing worked
      console.error("[auth/callback] No session after callback:", error);
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
