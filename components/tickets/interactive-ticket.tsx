// components/tickets/interactive-ticket.tsx — guest-facing interactive ticket.
// Wraps AdmitOneTicket (tilt disabled) in a custom tilt container so QR +
// ticket ID overlays move together with the ticket.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import AdmitOneTicket, { TICKET_TEXTURE, TICKET_GRADIENT, TICKET_LAYOUT, TICKET_GEOMETRY, ticketClipPath } from "@/components/ui/admit-one-ticket";
import { HoloOverlay } from "@/components/tickets/holo-overlay";
import { RadiantOverlay } from "@/components/tickets/radiant-overlay";
import QRCode from "qrcode";

interface TicketData {
  id: string;
  name: string;
  gender: string;
  age: number;
  ticketType: string;
  status: string;
}

interface SettingsData {
  name: string;
  place: string;
}

const TYPE_STYLES: Record<string, { texture: typeof TICKET_TEXTURE; gradient: typeof TICKET_GRADIENT }> = {
  Classic: {
    texture: { ...TICKET_TEXTURE, colorBack: "#1a1a2e", colorFront: "#16213e", colorHighlight: "#0f3460", shape: "simplex", type: "4x4", speed: 0.3 },
    gradient: { ...TICKET_GRADIENT, colorLight: "#1a1a2e", colorMid: "#16213e", colorDark: "#0f0f1a" },
  },
  Diamond: {
    texture: { ...TICKET_TEXTURE, colorBack: "#475569", colorFront: "#e2e8f0", colorHighlight: "#cbd5e1", shape: "ripple", type: "8x8", speed: 0.35 },
    gradient: { ...TICKET_GRADIENT, colorLight: "#e2e8f0", colorMid: "#94a3b8", colorDark: "#475569" },
  },
  SVIP: {
    // VIP base (ripple shader) but golden colors
    texture: { ...TICKET_TEXTURE, colorBack: "#bf953f", colorFront: "#fcf6ba", colorHighlight: "#b38728", shape: "ripple", type: "8x8", speed: 0.35 },
    gradient: { ...TICKET_GRADIENT, colorLight: "#fcf6ba", colorMid: "#bf953f", colorDark: "#aa771c" },
  },
  Gold: { texture: TICKET_TEXTURE, gradient: TICKET_GRADIENT },
};

export function InteractiveTicket({ ticket, settings }: { ticket: TicketData; settings: SettingsData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [ticketWidth, setTicketWidth] = useState(741);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [holoVars, setHoloVars] = useState({
    px: 50, py: 50, bx: 50, by: 50, fromCenter: 0, opacity: 0,
  });

  useEffect(() => {
    const update = () => setTicketWidth(Math.min(741, window.innerWidth - 32));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(ticket.id, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" }, errorCorrectionLevel: "H" }).then(setQrDataUrl).catch(() => {});
  }, [ticket.id]);

  useEffect(() => {
    if (canvasRef.current) QRCode.toCanvas(canvasRef.current, ticket.id, { width: 100, errorCorrectionLevel: "H" }).catch(() => {});
  }, [ticket.id]);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const dx = px - 0.5;
    const dy = py - 0.5;
    const fromCenter = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 0.5);

    el.style.transform = `perspective(1200px) rotateX(${-(dy * 2) * 9}deg) rotateY(${dx * 2 * 9}deg) scale(1.02)`;
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(38% 55% at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)`;
    }

    // Update holo vars for the overlay.
    setHoloVars({
      px: Math.round(px * 100),
      py: Math.round(py * 100),
      bx: Math.round(37 + px * 26),
      by: Math.round(33 + py * 34),
      fromCenter,
      opacity: 1,
    });
  }, []);

  const onLeave = useCallback(() => {
    setHovering(false);
    if (tiltRef.current) tiltRef.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)";
    if (glareRef.current) glareRef.current.style.background = "transparent";
    setHoloVars((v) => ({ ...v, opacity: 0, bx: 50, by: 50 }));
  }, []);

  const typeLabel = TICKET_TYPE_LABELS[ticket.ticketType as keyof typeof TICKET_TYPE_LABELS] ?? ticket.ticketType;
  const ticketStyle = TYPE_STYLES[ticket.ticketType] ?? TYPE_STYLES.Gold;
  const hasSettings = !!(settings.name || settings.place);
  const isClassic = ticket.ticketType === "Classic";
  const inkColor = isClassic ? "#ffffff" : "#5a3520";

  // Custom layout: move content up, bigger footer text.
  const customLayout = {
    ...TICKET_LAYOUT,
    nameTop: 150 / 741,      // moved up from 185
    footerTop: 290 / 741,    // moved up from 348
    footerSize: 22 / 741,    // bigger footer text
    inkColor: isClassic ? "#ffffff" : TICKET_LAYOUT.inkColor,
    watermarkColor: isClassic ? "#ffffff" : TICKET_LAYOUT.watermarkColor,
    // Smaller watermark for Classic tickets
    ...(isClassic ? { watermarkSize: 110 / 741, watermarkOpacity: 0.15 } : {}),
    // Engraved text effect for VVIP tickets
    ...(ticket.ticketType === "Gold" ? { engraved: true } : {}),
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-8">
      {/* Tilt container — transparent bg so notch cutouts don't show white */}
      <div
        ref={tiltRef}
        onPointerEnter={() => setHovering(true)}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative w-fit will-change-transform"
        style={{
          transition: hovering ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
          transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)",
          transformStyle: "preserve-3d",
          background: "transparent",
          backfaceVisibility: "hidden",
        }}
      >
        {/* No holographic overlays — clean shader tickets only */}

        <AdmitOneTicket
          tilt={false}
          name={ticket.name}
          presenter={`ENTRY PASS — ${typeLabel.toUpperCase()}`}
          event={hasSettings ? `${settings.name || ""}${settings.place ? `  •  ${settings.place}` : ""}` : ""}
          venue={""}
          dates={`${ticket.age} / ${ticket.gender}`}
          stubText="ADMIT ONE"
          watermark={typeLabel.toUpperCase()}
          width={ticketWidth}
          layout={customLayout}
          texture={ticketStyle.texture}
          gradient={ticketStyle.gradient}
        />

        {/* QR code overlay — bigger, moves with tilt */}
        {qrDataUrl && (
          <div
            className="pointer-events-none absolute rounded-lg bg-white p-1.5"
            style={{
              bottom: `${(30 / 741) * ticketWidth}px`,
              left: `${(425 / 741) * ticketWidth}px`,
              width: `${(110 / 741) * ticketWidth}px`,
              zIndex: 20,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR" className="w-full" />
          </div>
        )}

        {/* Ticket ID overlay — right beneath the age/gender footer */}
        <div
          className="pointer-events-none absolute font-medium uppercase whitespace-nowrap"
          style={{
            top: `${(325 / 741) * ticketWidth}px`,
            left: `${(57 / 741) * ticketWidth}px`,
            fontSize: `${customLayout.footerSize * ticketWidth}px`,
            letterSpacing: `${customLayout.footerTracking}em`,
            color: inkColor,
            opacity: 0.85,
            zIndex: 20,
          }}
        >
          ID: {ticket.id}
        </div>

        {/* Glare overlay — clipped to ticket shape so it doesn't show on cutouts */}
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            transition: hovering ? "none" : "background 420ms ease-out",
            clipPath: `path('${ticketClipPath(ticketWidth, ticketWidth / TICKET_GEOMETRY.aspect)}')`,
          }}
        />
      </div>

      {/* Hidden QR canvas for Wallet */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Google Wallet button */}
      <div className="mt-6 w-full max-w-[380px]">
        <WalletButton ticketId={ticket.id} name={ticket.name} typeLabel={typeLabel} eventName={settings.name} />
      </div>

      <p className="mt-4 text-center text-xs text-white/30">
        Tip: tilt your phone or move your mouse over the ticket ✨
      </p>
    </div>
  );
}

function WalletButton({ ticketId, name, typeLabel, eventName }: { ticketId: string; name: string; typeLabel: string; eventName: string; }) {
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet-pass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId, name, typeLabel, eventName }) });
      const data = await res.json();
      if (data.ok && data.url) window.location.href = data.url;
    } catch {}
    setLoading(false);
  }

  return (
    <button
      onClick={handleSave}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
    >
      {loading ? (
        <span className="animate-pulse">Preparing...</span>
      ) : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9.5 3c1.93 0 3.5 1.57 3.5 3.5S13.43 14 11.5 14 8 12.43 8 10.5 9.57 7 11.5 7zM5 18c.61-1.42 2.1-2.27 3.5-2.69.7-.21 1.45-.31 2-.31s1.3.1 2 .31c1.4.42 2.89 1.27 3.5 2.69H5z"/></svg>
          Save to Google Wallet
        </>
      )}
    </button>
  );
}
