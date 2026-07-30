// hooks/use-presence.ts — heartbeat (writes device presence every 10s) +
// admin presence dashboard (subscribes to all managed users' devices).
// Mirrors the original startHeartbeat (script.js:327) + admin subscriptions
// (script.js:555-570).

"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";

/** Get or create a persistent device id (localStorage, matches original). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("device_session_id");
  if (!id) {
    id =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    localStorage.setItem("device_session_id", id);
  }
  return id;
}

const ONLINE_THRESHOLD_MS = 30000; // 30s — matches original

export interface DeviceInfo {
  lastSeen: number;
  userAgent?: string;
  username?: string;
}

/**
 * Heartbeat: writes this device's presence every 10s while authenticated.
 */
export function useHeartbeat(
  userEmail: string | null,
  username: string | null
) {
  const deviceIdRef = useRef<string>("");

  useEffect(() => {
    if (!userEmail) return;
    deviceIdRef.current = getDeviceId();

    async function beat() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        await setDoc(
          doc(db, paths.presenceRoot, userEmail!, "devices", deviceIdRef.current),
          {
            lastSeen: Date.now(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            username: username || "unknown",
          },
          { merge: true }
        );
      } catch {
        // best-effort
      }
    }

    beat();
    const interval = setInterval(beat, 10000);
    return () => clearInterval(interval);
  }, [userEmail, username]);
}

/**
 * Admin presence: subscribes to each managed user's devices collection,
 * returning online status per email + per-username online counts.
 */
export function useAdminPresence(managedEmails: string[]) {
  const [status, setStatus] = useState<
    Record<string, { online: boolean; activeUsernames: string[]; lastSeen: number | null }>
  >({});

  const emailsKey = managedEmails.join(",");
  useEffect(() => {
    if (managedEmails.length === 0) return;
    const unsubs: (() => void)[] = [];

    managedEmails.forEach((email) => {
      const unsub = onSnapshot(
        collection(db, paths.presenceRoot, email, "devices"),
        (snap) => {
          const devices: DeviceInfo[] = [];
          snap.forEach((d) => {
            const data = d.data() as DeviceInfo;
            if (data.lastSeen) devices.push(data);
          });

          const now = Date.now();
          const activeUsernames = new Set<string>();
          let online = false;
          let maxLastSeen: number | null = null;

          devices.forEach((d) => {
            if (now - d.lastSeen < ONLINE_THRESHOLD_MS) {
              online = true;
              if (d.username && d.username !== "unknown") {
                activeUsernames.add(d.username);
              }
            }
            if (d.lastSeen > (maxLastSeen ?? 0)) maxLastSeen = d.lastSeen;
          });

          setStatus((prev) => ({
            ...prev,
            [email]: {
              online,
              activeUsernames: [...activeUsernames],
              lastSeen: maxLastSeen,
            },
          }));
        }
      );
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailsKey]);

  return status;
}
