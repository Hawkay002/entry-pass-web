// lib/firebase/log.ts — routes log actions to Upstash Redis (not Firestore).
// This saves Firestore write quota. Falls back gracefully if Redis is unavailable.

import { logActionToRedis } from "@/lib/redis-log";
import type { LogAction } from "@/lib/types";
import type { AppUser } from "@/lib/auth";

export async function logAction(
  user: AppUser,
  action: LogAction,
  details: string
): Promise<void> {
  await logActionToRedis(user, action, details);
}
