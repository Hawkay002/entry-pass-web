// components/layout/register-sw.tsx — registers the service worker on mount.
// Client-only, no UI. Mounted once in the root layout.

"use client";

import { useEffect } from "react";

export function RegisterSw() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      // Only register in production builds to avoid caching dev assets.
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] registration failed:", err);
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
