import { verifyTokenAction } from "./actions";

interface Props {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}

// Server component — calls the server action directly during render.
// The action sets cookies via next/headers and calls redirect().
export default async function VerifyPage({ searchParams }: Props) {
  const { token_hash, type = "magiclink" } = await searchParams;

  if (!token_hash) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400 text-sm">Invalid login link. Please request a new one.</p>
      </main>
    );
  }

  // This calls redirect() internally — page never finishes rendering
  await verifyTokenAction(token_hash, type);

  // Unreachable — redirect() throws internally in Next.js
  return null;
}
