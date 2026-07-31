// components/layout/help-tray.tsx — slide-out quick-help contact tray.
// Replicates the original app's approach: a single panel that slides in
// from the right via translateX, with the handle absolutely positioned
// on its left edge.

"use client";

import { useState } from "react";
import { Headset, ChevronLeft, X, Phone } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "fixed right-0 top-[70%] z-50 flex max-h-[45vh] w-[300px] flex-col -translate-y-1/2 rounded-l-[20px] border border-r-0 border-white/20 bg-black/90 backdrop-blur-xl shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-400 sm:top-1/2 sm:max-h-[65vh]",
        open ? "translate-x-0" : "translate-x-full"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
    >
      {/* Handle — absolutely positioned on the left edge, always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute -left-10 top-[25%] flex h-20 w-10 -translate-y-1/2 flex-col items-center justify-center gap-1.5 rounded-l-xl border border-r-0 border-white/20 bg-[#0f0f0f] text-white shadow-[-5px_0_15px_rgba(0,0,0,0.3)] transition-colors hover:bg-[#1a1a1a]"
        aria-label="Quick Help"
      >
        {open ? <X className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
        <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {/* Tray content */}
      <div className="overflow-y-auto p-6 scrollbar-thin">
        <h2 className="mb-3 text-lg font-semibold">Quick Help Tray</h2>
        <div className="space-y-3">
          {CONTACTS.map((c) => (
            <div key={c.role} className="rounded-xl bg-white/5 p-3">
              <p className="text-sm font-semibold">{c.role}</p>
              <p className="text-sm text-accent-secondary">{c.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              {(c.phone || c.whatsapp) && (
                <div className="mt-2 flex gap-2">
                  {c.whatsapp && (
                    <a
                      href={`https://wa.me/${c.whatsapp}`}
                      target="_blank"
                      className="flex items-center gap-1 rounded-lg bg-[#25D366]/20 px-2 py-1 text-xs text-[#25D366]"
                    >
                      <HugeiconsIcon icon={WhatsappIcon} size={12} /> WhatsApp
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
    </div>
  );
}
