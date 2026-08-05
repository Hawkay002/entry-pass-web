// lib/rate-limit.ts — small Upstash-Redis-backed rate limiter.
// Used to throttle brute-force attacks on public endpoints (e.g. /api/kiosk-checkin).

import { Redis } from "@upstash/redis";

function getRedis(): Redis {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

/**
 * Extract the client IP from a request, trusting Vercel's x-forwarded-for
 * (first hop) and falling back to x-real-ip.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  blocked: boolean;       // true once the failure threshold is exceeded
  remaining: number;      // attempts left in the current window
  retryAfter: number;     // seconds until the window resets (0 if not blocked)
}

/**
 * Record a failed attempt for `key` within a fixed `windowSec` window, capped
 * at `limit`. Returns whether the caller is now blocked from further *guessing*.
 *
 * Design note: a correct attempt should call `clearRateLimit(key)` so a
 * legitimate client (with the right PIN) is never DOS-locked by a spammer.
 */
export async function recordFailure(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const count = Number((await redis.incr(key)) ?? 1);
    // Set TTL only on the first increment so the window is anchored to the
    // first failure (not the last).
    if (count === 1) await redis.expire(key, windowSec);
    const ttl = Number((await redis.ttl(key)) ?? 0);
    const blocked = count > limit;
    return {
      blocked,
      remaining: Math.max(0, limit - count),
      retryAfter: blocked ? Math.max(1, ttl) : 0,
    };
  } catch (err) {
    // If Redis is down, fail open (don't block the event) — but log it.
    console.error("[rate-limit] recordFailure failed:", err);
    return { blocked: false, remaining: limit, retryAfter: 0 };
  }
}

/** Read the current failure count + TTL without incrementing. */
export async function getFailureState(
  key: string,
  limit: number
): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const count = Number((await redis.get(key)) ?? 0);
    const ttl = Number((await redis.ttl(key)) ?? 0);
    const blocked = count > limit;
    return {
      blocked,
      remaining: Math.max(0, limit - count),
      retryAfter: blocked ? Math.max(1, ttl) : 0,
    };
  } catch (err) {
    console.error("[rate-limit] getFailureState failed:", err);
    return { blocked: false, remaining: limit, retryAfter: 0 };
  }
}

/** Reset the counter after a successful attempt. */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch (err) {
    console.error("[rate-limit] clearRateLimit failed:", err);
  }
}
