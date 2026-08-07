// Fixed-window in-process rate limiter.
//
// Scope note: this is per serverless instance, so the effective limit across a
// fanned-out deployment is (limit x instances). That is still a hard ceiling on
// the worst case a single warm instance can do, which is what the AI endpoint
// needs most — it fans out to a paid provider on an authenticated-parent-only
// check. Promote to a Postgres or Redis counter when a global limit is required.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Bounded so a long-lived instance cannot grow the map without limit.
const maxTrackedKeys = 5_000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= maxTrackedKeys) sweep(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

// Exposed for tests only.
export function resetRateLimits() {
  windows.clear();
}
