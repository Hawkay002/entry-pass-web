// hooks/use-remote-locks.ts — staff-side realtime listener for remote locks.
// Mirrors the original listenForRemoteLocks (script.js:1187): subscribes to
// global_locks/{userEmail}, resolves the locked tabs + metadata for the
// current username, and exposes them so the nav + layout can enforce.

"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";
import type { LockMetadata, TabName } from "@/lib/types";

export interface RemoteLockState {
  lockedTabs: TabName[];
  metadata: LockMetadata | null;
}

export function useRemoteLocks(userEmail: string | null, username: string | null) {
  const [state, setState] = useState<RemoteLockState>({
    lockedTabs: [],
    metadata: null,
  });

  // Subscribe only for non-admin staff. Admins / unauthenticated callers get
  // the initial empty state (no subscription, no effect-driven reset).
  useEffect(() => {
    if (!userEmail || !username || username === "ADMIN") return;

    const unsub = onSnapshot(
      doc(db, paths.locksCollection, userEmail),
      (snap) => {
        if (!snap.exists()) {
          setState({ lockedTabs: [], metadata: null });
          return;
        }
        const data = snap.data();
        const userLocks = (data.userSpecificLocks?.[username] as TabName[]) ?? undefined;
        const meta = (data.lockMetadata?.[username] as LockMetadata) ?? null;
        // Legacy fallback: flat lockedTabs array for the whole email.
        const tabs = userLocks ?? ((data.lockedTabs as TabName[]) ?? []);
        setState({ lockedTabs: tabs, metadata: meta });
      },
      (err) => console.error("[useRemoteLocks] listener error:", err)
    );
    return unsub;
  }, [userEmail, username]);

  return state;
}
