// hooks/use-background.ts — UI preference for the app background image.
// Stored in localStorage (mirrors the "lastTab" pattern) — a per-device
// aesthetic choice, not structured data (so IndexedDB isn't warranted here).

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

export function useBackground() {
  const [bgId, setBgId] = useState<string>("default");

  // Read once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage
    setBgId(stored ?? "default");
  }, []);

  const setBackground = useCallback((id: string) => {
    setBgId(id);
    if (typeof window !== "undefined") {
      if (id === "default") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const preset = BACKGROUND_PRESETS.find((p) => p.id === bgId) ?? BACKGROUND_PRESETS[0];
  return { bgId, preset, setBackground };
}
