// lib/firebase/log.ts — write an audit entry to activity_logs.
// Server-only. Mirrors the original logAction() (script.js:298) but runs
// via the Admin SDK so writes are authenticated as the service account
// even under restrictive Firestore Rules.

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import type { LogAction } from "@/lib/types";
import type { AppUser } from "@/lib/auth";

export async function logAction(
  user: AppUser,
  action: LogAction,
  details: string
): Promise<void> {
  try {
    await getAdminDb().collection(paths.logsCollection).add({
      timestamp: Date.now(),
      userEmail: user.email ?? "",
      username: user.username,
      action,
      details,
    });
  } catch (err) {
    // Logging is best-effort; never let it break the primary operation.
    console.error("[logAction] failed:", err);
  }
}
