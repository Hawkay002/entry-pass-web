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

/** The curated set of background presets (single source of truth). */
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "default", label: "Starfield", url: "" },
  { id: "aurora", label: "Aurora", url: "/backgrounds/aurora.svg" },
  { id: "nebula", label: "Nebula", url: "/backgrounds/nebula.svg" },
  { id: "ocean", label: "Ocean", url: "/backgrounds/ocean.svg" },
  { id: "forest", label: "Forest", url: "/backgrounds/forest.svg" },
  { id: "ember", label: "Ember", url: "/backgrounds/ember.svg" },
  { id: "mesh", label: "Mesh Grid", url: "/backgrounds/mesh.svg" },
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
