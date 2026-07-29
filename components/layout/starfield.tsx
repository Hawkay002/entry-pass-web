// components/layout/starfield.tsx — animated starfield background.
// Recreates the original app's #star-container ambient effect.

"use client";

import { useEffect, useRef } from "react";

const STAR_COUNT = 80;

export function Starfield() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.innerHTML = "";
    const stars: HTMLDivElement[] = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement("div");
      const size = Math.random() * 2 + 1;
      Object.assign(star.style, {
        position: "absolute",
        width: `${size}px`,
        height: `${size}px`,
        background: "white",
        borderRadius: "50%",
        opacity: String(Math.random() * 0.5 + 0.1),
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 3}s`,
      });
      container.appendChild(star);
      stars.push(star);
    }

    return () => {
      stars.forEach((s) => s.remove());
    };
  }, []);

  return (
    <>
      <style>{`@keyframes twinkle{0%,100%{opacity:0.1}50%{opacity:0.6}}`}</style>
      <div
        ref={ref}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />
    </>
  );
}
