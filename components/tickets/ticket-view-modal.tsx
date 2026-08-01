// components/tickets/ticket-view-modal.tsx — view a ticket + share via WhatsApp.

"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { TicketCard } from "./ticket-card";
import { shareTicketViaWhatsApp } from "@/lib/whatsapp";
import type { Ticket } from "@/lib/types";

export function TicketViewModal({
  ticket,
  eventName,
  venue,
  open,
  onOpenChange,
}: {
  ticket: Ticket | null;
  eventName?: string;
  venue?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!ticket || !cardRef.current) return;
    setSharing(true);
    try {
      await shareTicketViaWhatsApp(cardRef.current, ticket.name, ticket.phone);
    } catch {
      setSharing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1rem)] p-1 sm:max-w-[460px] sm:p-4">
        <DialogHeader className="px-1 py-1 sm:px-0 sm:py-0">
          <DialogTitle>Ticket Preview</DialogTitle>
        </DialogHeader>

        {ticket && (
          <div className="space-y-1 px-1 py-1 sm:space-y-4 sm:px-0 sm:py-4">
            <div className="flex justify-center">
              <TicketCard ref={cardRef} ticket={ticket} eventName={eventName} venue={venue} />
            </div>
            <Button
              onClick={handleShare}
              disabled={sharing}
              className="w-full bg-[#25D366] text-white hover:bg-[#1faa54]"
            >
              {sharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HugeiconsIcon icon={WhatsappIcon} size={16} className="mr-2" primaryColor="currentColor" />
              )}
              Share via WhatsApp
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}