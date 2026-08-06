// lib/redis-log.ts — activity logging with hybrid Redis + Firestore storage.
//
// Strategy ("Redis to the fullest, overflow to Firestore"):
//   - The first MAX_LOGS entries go to a Redis list (fast recent access).
//   - Once Redis is full, every NEW entry is routed to Firestore instead.
//   - Nothing is ever lost: Redis holds the oldest batch, Firestore holds the
//     newer overflow. fetchAllLogs() merges both, sorted newest-first.
//   - This keeps Firestore writes at zero until Redis fills, then only one
//     write per log thereafter — minimal quota impact.

import { Redis } from "@upstash/redis";
import type { LogAction } from "@/lib/types";
import type { AppUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";

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

function makeEntry(
  userEmail: string,
  username: string,
  action: LogAction,
  details: string
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    userEmail,
    username,
    action,
    details,
  };
}

/**
 * Core write: route to Redis while it has room, else to Firestore. A safety
 * LTRIM guards against concurrent-write overshoot so Redis never exceeds
 * MAX_LOGS.
 */
async function writeLog(entry: LogEntry): Promise<void> {
  try {
    const redis = getRedis();
    const len = Number(await redis.llen("activity_logs")) || 0;
    if (len < MAX_LOGS) {
      await redis.lpush("activity_logs", JSON.stringify(entry));
      await redis.ltrim("activity_logs", 0, MAX_LOGS - 1);
      return;
    }
    // Redis is full — store the overflow in Firestore (Admin SDK, bypasses rules).
    await getAdminDb().collection(paths.logsCollection).doc(entry.id).set(entry);
  } catch (err) {
    console.error("[log] write failed:", err);
  }
}

/** Write a log entry (staff/admin actions). */
export async function logActionToRedis(
  user: AppUser,
  action: LogAction,
  details: string
): Promise<void> {
  await writeLog(makeEntry(user.email ?? "", user.username, action, details));
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
  await writeLog(makeEntry("kiosk", "KIOSK", action, details));
}

/** Fetch the latest N log entries from Redis only (the oldest batch). */
export async function fetchLogsFromRedis(
  count = MAX_LOGS
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

/** Fetch all overflow logs from Firestore (newest-first). */
async function fetchLogsFromFirestore(): Promise<LogEntry[]> {
  try {
    const snap = await getAdminDb()
      .collection(paths.logsCollection)
      .orderBy("timestamp", "desc")
      .get();
    return snap.docs.map((d) => d.data() as LogEntry);
  } catch (err) {
    console.error("[firestore-log] fetch failed:", err);
    return [];
  }
}

/**
 * Fetch EVERY log entry — Redis (oldest batch) + Firestore (newer overflow),
 * merged and sorted newest-first. Use this for the full Activity Logs view.
 */
export async function fetchAllLogs(): Promise<LogEntry[]> {
  const [redisLogs, firestoreLogs] = await Promise.all([
    fetchLogsFromRedis(MAX_LOGS),
    fetchLogsFromFirestore(),
  ]);
  // Every Firestore entry is newer than every Redis entry (Redis froze first),
  // but sort defensively by timestamp desc to guarantee order.
  return [...firestoreLogs, ...redisLogs].sort(
    (a, b) => b.timestamp - a.timestamp
  );
}

/** Delete specific log entries by id from both stores. */
export async function deleteLogsFromRedis(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  let deleted = 0;

  // 1. Remove from the Redis list.
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
      const isTarget = ids.includes(entry.id);
      if (isTarget) deleted++;
      return !isTarget;
    });
    await redis.del("activity_logs");
    if (remaining.length > 0) {
      // RPUSH in reverse order so newest stays at front.
      const reversed = [...remaining].reverse();
      await redis.rpush("activity_logs", ...reversed.map((r) => {
        if (typeof r === "string") return r;
        return JSON.stringify(r);
      }));
    }
  } catch (err) {
    console.error("[redis-log] delete failed:", err);
  }

  // 2. Remove any matching docs from Firestore (the overflow store).
  try {
    const db = getAdminDb();
    const batch = db.batch();
    let fsHits = 0;
    for (const id of ids) {
      batch.delete(db.collection(paths.logsCollection).doc(id));
      fsHits++;
    }
    if (fsHits > 0) await batch.commit();
    // Count Firestore deletions too (ids only exist in one store, so no double-count).
    deleted += fsHits;
  } catch (err) {
    console.error("[firestore-log] delete failed:", err);
  }

  // A given id lives in exactly one store; report the unique count requested.
  return ids.length;
}
