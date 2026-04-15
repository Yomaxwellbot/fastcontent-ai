import "server-only";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — persists across requests on a warm serverless instance.
// Good enough for MVP. Replace with Supabase rate_limits table for production scale.
const store = new Map<string, RateLimitEntry>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a given key.
 * @param key      Unique key, e.g. "magic_link:1.2.3.4"
 * @param limit    Max requests allowed per window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Periodically clean up expired entries (avoids unbounded memory growth)
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt <= now) store.delete(key);
  });
}, 5 * 60 * 1000); // every 5 minutes
