// components/tickets/radiant-overlay.tsx — Radiant Holofoil effect for VVIP tickets.
// Ported from pokemon-cards-css radiant-holo.css. Uses the original blend modes
// (color-dodge for shine/rainbow, hard-light for glare).

"use client";

import type { HoloVars } from "./holo-overlay";

export function RadiantOverlay({
  clipPath,
  vars,
}: {
  clipPath: string;
  vars: HoloVars;
}) {
  const cssVars: React.CSSProperties = {
    // @ts-expect-error custom CSS properties
    "--pointer-x": `${vars.px}%`,
    "--pointer-y": `${vars.py}%`,
    "--background-x": `${vars.bx}%`,
    "--background-y": `${vars.by}%`,
    "--pointer-from-center": vars.fromCenter,
    "--card-opacity": vars.opacity,
  };

  const crossHatch45 = `repeating-linear-gradient(45deg,
    hsl(0,0%,10%) 0%, hsl(0,0%,10%) 1.2%,
    hsl(0,0%,20%) 1.21%, hsl(0,0%,20%) 2.4%,
    hsl(0,0%,35%) 2.41%, hsl(0,0%,35%) 3.6%,
    hsl(0,0%,42.5%) 3.61%, hsl(0,0%,42.5%) 4.8%,
    hsl(0,0%,50%) 4.81%, hsl(0,0%,50%) 6%,
    hsl(0,0%,42.5%) 6.01%, hsl(0,0%,42.5%) 7.2%,
    hsl(0,0%,35%) 7.21%, hsl(0,0%,35%) 8.4%,
    hsl(0,0%,20%) 8.41%, hsl(0,0%,20%) 9.6%,
    hsl(0,0%,10%) 9.61%, hsl(0,0%,10%) 10.8%,
    hsl(0,0%,0%) 10.81%, hsl(0,0%,0%) 12%)`;

  const crossHatchMinus45 = `repeating-linear-gradient(-45deg,
    hsl(0,0%,10%) 0%, hsl(0,0%,10%) 1.2%,
    hsl(0,0%,20%) 1.21%, hsl(0,0%,20%) 2.4%,
    hsl(0,0%,35%) 2.41%, hsl(0,0%,35%) 3.6%,
    hsl(0,0%,42.5%) 3.61%, hsl(0,0%,42.5%) 4.8%,
    hsl(0,0%,50%) 4.81%, hsl(0,0%,50%) 6%,
    hsl(0,0%,42.5%) 6.01%, hsl(0,0%,42.5%) 7.2%,
    hsl(0,0%,35%) 7.21%, hsl(0,0%,35%) 8.4%,
    hsl(0,0%,20%) 8.41%, hsl(0,0%,20%) 9.6%,
    hsl(0,0%,10%) 9.61%, hsl(0,0%,10%) 10.8%,
    hsl(0,0%,0%) 10.81%, hsl(0,0%,0%) 12%)`;

  return (
    <div
      className="absolute inset-0"
      style={{
        ...cssVars,
        clipPath: `path('${clipPath}')`,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* Cross-hatch pattern — original from pokemon-cards-css, NO radial gradient */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `${crossHatch45}, ${crossHatchMinus45}`,
        backgroundSize: "210% 210%, 210% 210%",
        backgroundPosition: "calc(((var(--background-x) - 50%) * 1.5) + 50%) calc(((var(--background-y) - 50%) * 1.5) + 50%), calc(((var(--background-x) - 50%) * 1.5) + 50%) calc(((var(--background-y) - 50%) * 1.5) + 50%)",
        backgroundBlendMode: "exclusion, darken, color-dodge",
        filter: "brightness(0.5) contrast(2) saturate(1.75)",
        mixBlendMode: "color-dodge",
        opacity: `calc(var(--card-opacity) * 0.5)`,
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
      }} />

      {/* Rainbow shimmer */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `repeating-linear-gradient(55deg, hsl(3, 95%, 85%) 200px, hsl(207, 100%, 84%) 400px, hsl(29, 100%, 85%) 600px, hsl(160, 100%, 86%) 800px, hsl(309, 94%, 87%) 1000px, hsl(188, 95%, 85%) 1200px, hsl(3, 95%, 85%) 1400px)`,
        backgroundSize: "400% 100%",
        backgroundPosition: "calc(((var(--background-x) - 50%) * -2.5) + 50%) calc(((var(--background-y) - 50%) * -2.5) + 50%)",
        filter: "brightness(0.6) contrast(3) saturate(2)",
        mixBlendMode: "color-dodge",
        opacity: `calc(var(--card-opacity) * 0.4)`,
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
      }} />
    </div>
  );
}
