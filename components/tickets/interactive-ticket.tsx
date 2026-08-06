// components/tickets/interactive-ticket.tsx — the guest-facing interactive ticket.
// Features: 3D tilt on pointer move, moving specular shine, per-type theme
// gradients, live status badge (Firestore onSnapshot), QR code, and a
// "Save to Google Wallet" button.

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import QRCode from "qrcode";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

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

const TYPE_THEME: Record<string, { bg: string; text: string }> = {
  Classic: { bg: "bg-black", text: "text-white" },
  Diamond: { bg: "bg-[linear-gradient(125deg,#e2e8f0_0%,#ffffff_40%,#94a3b8_100%)]", text: "text-[#0f2433]" },
  Gold: { bg: "bg-[linear-gradient(135deg,#bf953f,#fcf6ba,#b38728,#fbf5b7,#aa771c)]", text: "text-[#3e2704]" },
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  "coming-soon": { label: "Coming Soon", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  arrived: { label: "Arrived ✓", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  absent: { label: "Absent", className: "bg-red-500/20 text-red-400 border-red-500/40" },
};

export function InteractiveTicket({ ticket, settings }: { ticket: TicketData; settings: SettingsData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState(ticket.status);

  // Render QR.
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, ticket.id, {
        width: 120,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).catch(() => {});
    }
  }, [ticket.id]);

  // Live status via Firestore onSnapshot.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, paths.ticketsCollection, ticket.id),
      (snap) => {
        if (snap.exists()) {
          const s = snap.data().status;
          if (typeof s === "string") setStatus(s);
        }
      },
      () => {} // ignore errors — status is best-effort
    );
    return unsub;
  }, [ticket.id]);

  const theme = TYPE_THEME[ticket.ticketType] ?? TYPE_THEME.Classic;
  const typeLabel = TICKET_TYPE_LABELS[ticket.ticketType as keyof typeof TICKET_TYPE_LABELS] ?? ticket.ticketType;
  const statusInfo = STATUS_STYLE[status] ?? STATUS_STYLE["coming-soon"];

  // Tilt + shine motion values.
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), { stiffness: 150, damping: 20 });
  const [isHovering, setIsHovering] = useState(false);

  // Shine overlay position.
  const shineX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const shineY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
  const shineBg = useMotionTemplate`radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.25) 0%, transparent 50%)`;

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-8">
      {/* Tilt container */}
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => {
          setIsHovering(false);
          mouseX.set(0.5);
          mouseY.set(0.5);
        }}
        style={{ rotateX, rotateY, transformPerspective: 1000 }}
        className="relative w-full max-w-[380px]"
      >
        {/* Ticket card */}
        <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl", theme.bg)}>
          {/* Shine overlay */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
            style={{ background: shineBg, opacity: isHovering ? 1 : 0 }}
          />

          {/* Content */}
          <div className={cn("relative z-20 p-6", theme.text)}>
            {/* Status badge */}
            <div className="mb-4 flex justify-end">
              <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusInfo.className)}>
                {statusInfo.label}
              </span>
            </div>

            {/* Header */}
            <div className="mb-1 text-center">
              <h2 className="text-lg font-bold tracking-wide">
                ENTRY PASS — {typeLabel.toUpperCase()}
              </h2>
            </div>
            {settings.name && (
              <p className="text-center text-sm opacity-70">{settings.name}</p>
            )}
            {settings.place && (
              <p className="text-center text-xs opacity-60">{settings.place}</p>
            )}

            {/* Divider */}
            <div className="my-4 border-t border-current opacity-20" />

            {/* QR */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-xl bg-white p-2">
                <canvas ref={canvasRef} />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-60">Guest</span>
                <span className="text-sm font-bold">{ticket.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-60">Profile</span>
                <span className="text-sm font-semibold">{ticket.age} / {ticket.gender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-60">Type</span>
                <span className="text-sm font-semibold">{typeLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-60">ID</span>
                <span className="font-mono text-xs opacity-50">{ticket.id}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 border-t border-current pt-3 text-center opacity-50">
              <p className="text-[0.65rem] uppercase tracking-wider">
                Scan this code at the entrance for admission
              </p>
            </div>
          </div>
        </div>
      </motion.div>

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
function WalletButton({
  ticketId,
  name,
  typeLabel,
  eventName,
}: {
  ticketId: string;
  name: string;
  typeLabel: string;
  eventName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [walletUrl, setWalletUrl] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, name, typeLabel, eventName }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      }
    } catch {
      // ignore — button degrades gracefully
    }
    setLoading(false);
  }

  // Check if Wallet is configured on mount.
  useEffect(() => {
    fetch("/api/wallet-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkOnly: true }),
    })
      .then((r) => r.json())
      .then((data) => { if (!data.ok) setWalletUrl(null); })
      .catch(() => {});
  }, []);

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
