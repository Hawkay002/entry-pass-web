// hooks/use-typing.ts — typing indicators. Writes throttled (2s) keystrokes
// to typing_status/{channelKey}, and reads the channel's typing doc to show
// who's typing (3s freshness window). Mirrors original (script.js:3814-3863).

"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";

const WRITE_THROTTLE_MS = 2000;
const FRESHNESS_MS = 3000;

/** Send typing status (call on input). Throttled to once per 2s. */
export function useSendTyping(
  channelKey: string | null,
  username: string | null
) {
  const lastSentRef = useRef(0);

  return () => {
    if (!channelKey || !username) return;
    const now = Date.now();
    if (now - lastSentRef.current < WRITE_THROTTLE_MS) return;
    lastSentRef.current = now;

    setDoc(
      doc(db, paths.typingCollection, channelKey),
      { [username]: now },
      { merge: true }
    ).catch(() => {});
  };
}

/** Subscribe to a channel's typing status; return active typers (excluding self). */
export function useTypingStatus(
  channelKey: string | null,
  myUsername: string | null
): string[] {
  const [typers, setTypers] = useState<string[]>([]);

  useEffect(() => {
    if (!channelKey) return;

    const unsub = onSnapshot(
      doc(db, paths.typingCollection, channelKey),
      (snap) => {
        if (!snap.exists()) {
          setTypers([]);
          return;
        }
        const data = snap.data() as Record<string, number>;
        const now = Date.now();
        const active = Object.entries(data)
          .filter(
            ([user, ts]) => user !== myUsername && now - ts < FRESHNESS_MS
          )
          .map(([user]) => user);
        setTypers(active);
      }
    );
    return unsub;
  }, [channelKey, myUsername]);

  return typers;
}
