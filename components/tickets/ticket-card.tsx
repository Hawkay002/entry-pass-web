// components/tickets/ticket-card.tsx — the printable ticket card with QR.
// Mirrors the original's per-type theming (Classic/Diamond/Gold) and the
// QR encoding ticket.id (script.js:1624-1633).

"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import type { Ticket } from "@/lib/types";

const TYPE_THEME: Record<string, string> = {
  Classic: "border-t-4 border-t-accent-secondary bg-black",
  Diamond:
    "text-[#0f2433] bg-[linear-gradient(125deg,#e2e8f0_0%,#ffffff_40%,#94a3b8_100%)] border-t-4 border-t-white",
  Gold:
    "text-[#3e2704] bg-[linear-gradient(135deg,#bf953f,#fcf6ba,#b38728,#fbf5b7,#aa771c)] border-t-4 border-t-white",
};

export function TicketCard({
  ticket,
  eventName,
}: {
  ticket: Pick<Ticket, "id" | "name" | "age" | "gender" | "phone" | "ticketType">;
  eventName?: string;
}) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const theme = TYPE_THEME[ticket.ticketType] ?? TYPE_THEME.Classic;
  const typeLabel = TICKET_TYPE_LABELS[ticket.ticketType];

  useEffect(() => {
    const canvas = qrRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, ticket.id, {
      width: 100,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).catch((err) => console.error("[TicketCard] QR error:", err));
  }, [ticket.id]);

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10", theme)}>
      <div className="px-5 pt-4">
        <h3 className="text-lg font-semibold tracking-tight">
          ENTRY PASS — {typeLabel.toUpperCase()}
        </h3>
        <p className="text-sm opacity-70">{eventName || "Event details loading..."}</p>
      </div>
      <div className="flex items-stretch gap-4 px-5 py-4">
        <div className="flex-1 space-y-2 text-sm">
          <Row label="Guest Name" value={ticket.name} />
          <Row label="Profile" value={`${ticket.age} / ${ticket.gender}`} />
          <Row label="Contact" value={ticket.phone} />
          <div className="inline-block rounded-full bg-black/20 px-2 py-0.5 font-mono text-xs">
            ID: {ticket.id}
          </div>
        </div>
        <div className="flex items-center">
          <canvas ref={qrRef} className="rounded bg-white p-1" />
        </div>
      </div>
      <div className="bg-black/10 px-5 py-2 text-center text-[0.65rem] tracking-widest opacity-70">
        SCAN THIS CODE AT THE ENTRANCE FOR ADMISSION
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="opacity-60">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
