// components/tickets/interactive-ticket.tsx — guest-facing interactive ticket.
// Uses the WebGL AdmitOneTicket component with per-type color themes,
// built-in tilt + glare + dithering shader. QR + ticket ID rendered onto the
// ticket via the layout props.

"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import AdmitOneTicket, { TICKET_TEXTURE, TICKET_GRADIENT, TICKET_LAYOUT } from "@/components/ui/admit-one-ticket";
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

// Per-type color themes for the shader ticket.
const TYPE_STYLES: Record<string, { texture: typeof TICKET_TEXTURE; gradient: typeof TICKET_GRADIENT }> = {
  Classic: {
    texture: { ...TICKET_TEXTURE, colorBack: "#1a1a2e", colorFront: "#16213e", colorHighlight: "#0f3460", shape: "simplex", type: "4x4", speed: 0.3 },
    gradient: { ...TICKET_GRADIENT, colorLight: "#1a1a2e", colorMid: "#16213e", colorDark: "#0f0f1a" },
  },
  Diamond: {
    texture: { ...TICKET_TEXTURE, colorBack: "#475569", colorFront: "#e2e8f0", colorHighlight: "#cbd5e1", shape: "ripple", type: "8x8", speed: 0.35 },
    gradient: { ...TICKET_GRADIENT, colorLight: "#e2e8f0", colorMid: "#94a3b8", colorDark: "#475569" },
  },
  Gold: { texture: TICKET_TEXTURE, gradient: TICKET_GRADIENT },
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  "coming-soon": { label: "Coming Soon", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  arrived: { label: "Arrived ✓", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  absent: { label: "Absent", className: "bg-red-500/20 text-red-400 border-red-500/40" },
};

// Custom layout: bigger ENTRY PASS label, event name + venue beneath it,
// QR code rendered as the watermark/stub, ticket ID in the footer.
function makeLayout(qrCanvas: HTMLCanvasElement | null, ticketId: string, eventName: string, venue: string, typeLabel: string) {
  return {
    ...TICKET_LAYOUT,
    // Bigger label (ENTRY PASS — VIP)
    labelSize: 28 / 741,
    labelLead: 34 / 741,
    labelTop: 50 / 741,
    // Name stays in its position
    nameTop: 190 / 741,
    // Footer: just age/gender (no venue)
    footerTop: 355 / 741,
    // Bigger stub text (ticket type)
    stubSize: 58 / 741,
  };
}

export function InteractiveTicket({ ticket, settings }: { ticket: TicketData; settings: SettingsData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState(ticket.status);
  const [ticketWidth, setTicketWidth] = useState(741);

  // Responsive width.
  useEffect(() => {
    const update = () => setTicketWidth(Math.min(741, window.innerWidth - 32));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Render QR.
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, ticket.id, {
        width: 100,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).catch(() => {});
    }
  }, [ticket.id]);

  // Live status via Firestore onSnapshot.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, paths.ticketsCollection, ticket.id),
      (snap) => { if (snap.exists()) { const s = snap.data().status; if (typeof s === "string") setStatus(s); } },
      () => {}
    );
    return unsub;
  }, [ticket.id]);

  const typeLabel = TICKET_TYPE_LABELS[ticket.ticketType as keyof typeof TICKET_TYPE_LABELS] ?? ticket.ticketType;
  const statusInfo = STATUS_STYLE[status] ?? STATUS_STYLE["coming-soon"];
  const ticketStyle = TYPE_STYLES[ticket.ticketType] ?? TYPE_STYLES.Gold;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-8">
      {/* Status badge */}
      <div className="mb-6">
        <span className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", statusInfo.className)}>
          {statusInfo.label}
        </span>
      </div>

      {/* Shader ticket — no overflow-hidden container so tilt isn't clipped */}
      <div style={{ perspective: "1200px" }}>
        <AdmitOneTicket
          name={ticket.name}
          presenter={`ENTRY PASS — ${typeLabel.toUpperCase()}`}
          event={settings.name || "Event Name"}
          venue={settings.place || "Venue"}
          dates={`${ticket.age} / ${ticket.gender}`}
          stubText={typeLabel}
          watermark={ticket.id.slice(-4).toUpperCase()}
          width={ticketWidth}
          texture={ticketStyle.texture}
          gradient={ticketStyle.gradient}
        />
      </div>

      {/* Hidden QR canvas (rendered for Wallet/scanning, not displayed on page) */}
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

/** Google Wallet save button — shows "Coming Soon" if pass class not configured. */
function WalletButton({ ticketId, name, typeLabel, eventName }: { ticketId: string; name: string; typeLabel: string; eventName: string; }) {
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, name, typeLabel, eventName }),
      });
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
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9.5 3c1.93 0 3.5 1.57 3.5 3.5S13.43 14 11.5 14 8 12.43 8 10.5 9.57 7 11.5 7zM5 18c.61-1.42 2.1-2.27 3.5-2.69.7-.21 1.45-.31 2-.31s1.3.1 2 .31c1.4.42 2.89 1.27 3.5 2.69H5z"/>
          </svg>
          Save to Google Wallet
        </>
      )}
    </button>
  );
}
