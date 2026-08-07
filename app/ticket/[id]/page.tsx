// app/ticket/[id]/page.tsx — public guest ticket page.
// Fetches ticket + event settings server-side, gates behind phone verification.
// Shows an interactive tilt-shine ticket with live status + Google Wallet button.

import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { TicketView } from "@/components/tickets/ticket-view";

export const dynamic = "force-dynamic";

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

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch ticket + settings server-side (Admin SDK bypasses rules).
  const db = getAdminDb();
  const [ticketSnap, settingsSnap] = await Promise.all([
    db.collection(paths.ticketsCollection).doc(id).get(),
    db.doc(paths.settingsDoc).get(),
  ]);

  if (!ticketSnap.exists) {
    notFound();
  }

  const t = ticketSnap.data() as Record<string, unknown>;
  const ticket: TicketData = {
    id,
    name: String(t.name ?? ""),
    gender: String(t.gender ?? "Other"),
    age: Number(t.age ?? 0),
    ticketType: String(t.ticketType ?? "Classic"),
    status: String(t.status ?? "coming-soon"),
  };

  const s = settingsSnap.data();
  const settings: SettingsData = {
    name: String(s?.name ?? ""),
    place: String(s?.place ?? ""),
  };

  return <TicketView ticket={ticket} settings={settings} />;
}
