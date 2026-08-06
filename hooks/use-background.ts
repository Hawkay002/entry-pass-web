// hooks/use-background.ts — UI preference for the app background image.
// Stored in localStorage (mirrors the "lastTab" pattern) — a per-device
// aesthetic choice, not structured data (so IndexedDB isn't warranted here).
//
// Multiple components use this hook (the shell renders the background, the
// picker modal selects it). A module-level store + event keeps them in sync
// so a change in the modal applies live — no page refresh needed.

"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bgImage";

export interface BackgroundPreset {
  id: string;
  label: string;
  url: string; // "" = starfield default
}

/** The curated set of background presets (single source of truth).
 *  Ordered by file size, smallest first, so the modal loads light thumbnails
 *  before heavy ones. */
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "default", label: "Starfield", url: "" },
  { id: "nocturne", label: "Nocturne", url: "/backgrounds/nocturne.png" },
  { id: "underwater", label: "Underwater", url: "/backgrounds/underwater.png" },
  { id: "waterfall", label: "Waterfall", url: "/backgrounds/waterfall.png" },
  { id: "perplex-1", label: "Perplex I", url: "/backgrounds/perplex-1.png" },
  { id: "reverie", label: "Reverie", url: "/backgrounds/reverie.png" },
  { id: "zephyr", label: "Zephyr", url: "/backgrounds/zephyr.png" },
  { id: "perplex-2", label: "Perplex II", url: "/backgrounds/perplex-2.png" },
  { id: "perplex-3", label: "Perplex III", url: "/backgrounds/perplex-3.png" },
  { id: "viridian-1", label: "Viridian I", url: "/backgrounds/viridian-1.png" },
  { id: "perplex-4", label: "Perplex IV", url: "/backgrounds/perplex-4.png" },
  { id: "viridian-2", label: "Viridian II", url: "/backgrounds/viridian-2.png" },
  { id: "elysian", label: "Elysian", url: "/backgrounds/elysian.png" },
];

// ---- Module-level store (sync across all hook instances) ----

let currentBgId = "default";
const listeners = new Set<(id: string) => void>();

function readStored(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(STORAGE_KEY) ?? "default";
}

function notify(id: string) {
  listeners.forEach((fn) => fn(id));
}

export function useBackground() {
  const [bgId, setBgId] = useState<string>(currentBgId);

  // Sync from localStorage on mount, and subscribe to cross-instance changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage
    setBgId(readStored());
    const listener = (id: string) => setBgId(id);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setBackground = useCallback((id: string) => {
    currentBgId = id;
    if (typeof window !== "undefined") {
      if (id === "default") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, id);
    }
    notify(id);
  }, []);

  const preset = BACKGROUND_PRESETS.find((p) => p.id === bgId) ?? BACKGROUND_PRESETS[0];
  return { bgId, preset, setBackground };
}
