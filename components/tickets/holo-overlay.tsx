// components/tickets/holo-overlay.tsx — V Full Art holographic effect overlay.
// Ported from pokemon-cards-css. Sits on top of the AdmitOneTicket as an
// absolutely-positioned layer. Pointer vars are passed from the parent tilt
// container (which already tracks pointer movement).

"use client";

export interface HoloVars {
  px: number;
  py: number;
  bx: number;
  by: number;
  fromCenter: number;
  opacity: number;
}

export function HoloOverlay({
  clipPath,
  vars,
}: {
  width: number;
  height: number;
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

  return (
    <>
      <style>{`
        .holo-shine {
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(
              125deg,
              #f80e35 5%,
              #eedf10 10%,
              #21e985 15%,
              #0dbde9 20%,
              #c929f1 25%,
              #f80e35 30%,
              #f80e35 35%
            );
          background-position: 0% var(--background-y);
          background-size: 200% 700%;
          filter: brightness(calc((var(--pointer-from-center) * 0.4) + 0.4)) contrast(1.4) saturate(2.25);
          mix-blend-mode: plus-lighter;
          opacity: calc(var(--card-opacity) * 0.2);
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .holo-glare {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(
            farthest-corner circle at var(--pointer-x) var(--pointer-y),
            hsla(0, 0%, 100%, 0.8) 0%,
            hsla(0, 0%, 100%, 0) 60%
          );
          background-size: 120% 150%;
          background-position: center center;
          mix-blend-mode: plus-lighter;
          filter: brightness(1) contrast(1);
          opacity: calc(var(--card-opacity) * 0.2);
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          ...cssVars,
          clipPath: `path('${clipPath}')`,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Shine layer — sun pillar rainbow + foil */}
        <div className="holo-shine" />

        {/* Glare layer — radial spotlight */}
        <div className="holo-glare" />
      </div>
    </>
  );
}
