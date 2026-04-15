"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthButton({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400">{email}</span>
      <button
        onClick={handleLogout}
        className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
