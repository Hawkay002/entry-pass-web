// lib/redis-log.ts — activity logging via Upstash Redis.
// Replaces Firestore for logs to save Firestore write quota.
// Logs are stored as a Redis list, auto-pruned to last 1000 entries.

import { Redis } from "@upstash/redis";
import type { LogAction } from "@/lib/types";
import type { AppUser } from "@/lib/auth";

const MAX_LOGS = 1000;

function getRedis(): Redis {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

export interface LogEntry {
  id: string;
  timestamp: number;
  userEmail: string;
  username: string;
  action: LogAction;
  details: string;
}

/** Write a log entry to Redis. Auto-prunes to MAX_LOGS. */
export async function logActionToRedis(
  user: AppUser,
  action: LogAction,
  details: string
): Promise<void> {
  try {
    const redis = getRedis();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      userEmail: user.email ?? "",
      username: user.username,
      action,
      details,
    };
    // LPUSH adds to the front (newest first).
    await redis.lpush("activity_logs", JSON.stringify(entry));
    // LTRIM keeps only the first MAX_LOGS entries (auto-prune old).
    await redis.ltrim("activity_logs", 0, MAX_LOGS - 1);
  } catch (err) {
    console.error("[redis-log] write failed:", err);
  }
}

/**
 * Write a kiosk (self check-in) log entry. The public kiosk endpoint has no
 * authenticated AppUser, so this writes a synthetic entry attributed to the
 * KIOSK "user". Used by /api/kiosk-checkin.
 */
export async function logKioskAction(
  action: LogAction,
  details: string
): Promise<void> {
  try {
    const redis = getRedis();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      userEmail: "kiosk",
      username: "KIOSK",
      action,
      details,
    };
    await redis.lpush("activity_logs", JSON.stringify(entry));
    await redis.ltrim("activity_logs", 0, MAX_LOGS - 1);
  } catch (err) {
    console.error("[redis-log] kiosk write failed:", err);
  }
}

/** Fetch the latest N log entries from Redis. */
export async function fetchLogsFromRedis(
  count = 500
): Promise<LogEntry[]> {
  try {
    const redis = getRedis();
    const raw = await redis.lrange("activity_logs", 0, count - 1);
    return raw.map((r) => {
      // Upstash may return parsed objects or strings depending on config.
      if (typeof r === "string") {
        try {
          return JSON.parse(r) as LogEntry;
        } catch {
          return null;
        }
      }
      // Already an object (Upstash auto-deserialized).
      return r as unknown as LogEntry;
    }).filter(Boolean) as LogEntry[];
  } catch (err) {
    console.error("[redis-log] fetch failed:", err);
    return [];
  }
}

/** Delete specific log entries by id (for the admin delete feature). */
export async function deleteLogsFromRedis(ids: string[]): Promise<number> {
  try {
    const redis = getRedis();
    const raw = await redis.lrange("activity_logs", 0, -1);
    const remaining = raw.filter((r) => {
      let entry: LogEntry;
      if (typeof r === "string") {
        try { entry = JSON.parse(r); } catch { return true; }
      } else {
        entry = r as unknown as LogEntry;
      }
      return !ids.includes(entry.id);
    });
    // Replace the entire list.
    await redis.del("activity_logs");
    if (remaining.length > 0) {
      // RPUSH in reverse order so newest stays at front.
      const reversed = [...remaining].reverse();
      await redis.rpush("activity_logs", ...reversed.map((r) => {
        if (typeof r === "string") return r;
        return JSON.stringify(r);
      }));
    }
    return ids.length;
  } catch (err) {
    console.error("[redis-log] delete failed:", err);
    return 0;
  }
}
