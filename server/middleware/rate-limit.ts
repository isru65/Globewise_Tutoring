interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${options.keyPrefix}:${identifier}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds,
  };
}

export default function rateLimitMiddleware(): void {
  // Route-level rate limits are enforced explicitly via checkRateLimit()
}