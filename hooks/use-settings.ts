// hooks/use-settings.ts — realtime subscription to event settings/config.
// Mirrors the original app's settingsUnsubscribe onSnapshot (script.js:1495).

"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/env";
import type { EventSettings } from "@/lib/types";

const EMPTY: EventSettings = { name: "", place: "", deadline: "" };

export function useSettings() {
  const [settings, setSettings] = useState<EventSettings>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, paths.settingsDoc),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSettings({
            name: d.name ?? "",
            place: d.place ?? "",
            deadline: d.deadline ?? "",
          });
        } else {
          setSettings(EMPTY);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useSettings] listener error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { settings, loading };
}
