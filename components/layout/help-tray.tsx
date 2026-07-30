// components/layout/help-tray.tsx — slide-out quick-help contact tray.
// Mirrors the original contactTray (index.html:750) with the same contacts.

"use client";

import { useState } from "react";
import { Headset, ChevronRight, Phone, MessageCircle, X } from "lucide-react";

interface Contact {
  role: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  description: string;
}

const CONTACTS: Contact[] = [
  {
    role: "Admin/Developer",
    name: "Shovith Debnath",
    phone: "+918777845713",
    whatsapp: "918777845713",
    description: "For system errors, bugs, or technical app support.",
  },
  {
    role: "Event Manager",
    name: "Rakesh Sharma",
    phone: "+919830009228",
    whatsapp: "919830009228",
    description: "For event schedule, logistics, and operational inquiries.",
  },
  {
    role: "Registration Desk",
    name: "Priya Malhotra",
    description: "For guest list discrepancies or check-in assistance.",
  },
  {
    role: "Security Head",
    name: "Vikram Singh",
    description: "For safety concerns, crowd control, or emergency reporting.",
  },
  {
    role: "Medical Support",
    name: "Dr. Anjali Gupta",
    description: "For first aid, medical emergencies, or health assistance.",
  },
  {
    role: "Venue Coordinator",
    name: "Amit Roy",
    description: "For facility access, lighting, or infrastructure issues.",
  },
  {
    role: "Catering Manager",
    name: "Sneha Kapoor",
    description: "For food, beverage, and dietary requirement queries.",
  },
];

export function HelpTray() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Handle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed left-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-xl bg-[var(--bg-surface,#0f0f0f)] px-2 py-3 shadow-lg transition-colors hover:bg-white/5"
        aria-label="Quick Help"
      >
        {open ? <X className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
        <ChevronRight
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Tray content */}
      {open && (
        <div className="fixed left-10 top-1/2 z-40 max-h-[80vh] w-80 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--bg-surface,#0f0f0f)] p-4 shadow-2xl scrollbar-thin">
          <h2 className="mb-3 text-lg font-semibold">Quick Help Tray</h2>
          <div className="space-y-3">
            {CONTACTS.map((c) => (
              <div key={c.role} className="rounded-xl bg-white/5 p-3">
                <p className="text-sm font-semibold">{c.role}</p>
                <p className="text-sm text-accent-secondary">{c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.description}
                </p>
                {(c.phone || c.whatsapp) && (
                  <div className="mt-2 flex gap-2">
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp}`}
                        target="_blank"
                        className="flex items-center gap-1 rounded-lg bg-[#25D366]/20 px-2 py-1 text-xs text-[#25D366]"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1 rounded-lg bg-accent-secondary/20 px-2 py-1 text-xs text-accent-secondary"
                      >
                        <Phone className="h-3 w-3" /> Call
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
