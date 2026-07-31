// app/actions/tickets.ts — server actions for ticket CRUD + scan validation.
// All operations are authenticated via the session cookie and authorized
// server-side (replacing the original client-side-only writes).

"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { getAppUser } from "@/lib/firebase/server-auth";
import { logAction } from "@/lib/firebase/log";
import type { Gender, TicketType } from "@/lib/types";
import { revalidatePath } from "next/cache";

/** Create a new ticket. Returns the new ticket id, or null on auth failure. */
export async function createTicket(input: {
  name: string;
  gender: Gender;
  age: number;
  phone: string; // raw digits, will be prefixed +91
  ticketType: TicketType;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const now = Date.now();
  const ticket = {
    name: input.name.trim(),
    gender: input.gender,
    age: input.age,
    phone: "+91" + input.phone.replace(/\D/g, ""),
    ticketType: input.ticketType,
    status: "coming-soon" as const,
    scanned: false,
    scannedAt: null,
    scannedBy: null,
    createdBy: user.username,
    createdAt: now,
  };

  const ref = await getAdminDb()
    .collection(paths.ticketsCollection)
    .add(ticket);

  await logAction(
    user,
    "TICKET_CREATE",
    `Ticket issued for ${ticket.name} (ID: ${ref.id.slice(0, 6)})`
  );

  revalidatePath("/guests");
  return { ok: true, id: ref.id };
}

/** Mark a ticket as arrived on scan. Returns the outcome for UI feedback. */
export async function validateTicket(
  ticketId: string
): Promise<
  | { ok: true; outcome: "granted" | "already" | "invalid"; ticket: { name: string; id: string; status: string } | null }
  | { ok: false; error: string }
> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const db = getAdminDb();
  const ref = db.collection(paths.ticketsCollection).doc(ticketId);
  const snap = await ref.get();

  if (!snap.exists) {
    await logAction(user, "SCAN_ENTRY", `Invalid scan: ${ticketId.slice(0, 8)}`);
    return { ok: true, outcome: "invalid", ticket: null };
  }

  const data = snap.data() as Record<string, unknown>;
  const name = String(data.name ?? "");
  const status = String(data.status ?? "coming-soon");
  const scanned = Boolean(data.scanned);

  if (status === "coming-soon" && !scanned) {
    await ref.update({
      status: "arrived",
      scanned: true,
      scannedAt: Date.now(),
      scannedBy: user.username,
    });
    await logAction(
      user,
      "SCAN_ENTRY",
      `Scanned: ${name} (ID: ${ticketId.slice(0, 6)})`
    );
    return {
      ok: true,
      outcome: "granted",
      ticket: { name, id: ticketId, status: "arrived" },
    };
  }

  // Already scanned or in another status — report without mutating.
  return {
    ok: true,
    outcome: "already",
    ticket: { name, id: ticketId, status },
  };
}

/** Bulk-delete tickets by id (admin only). Returns count deleted. */
export async function deleteTickets(
  ids: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.role !== "admin")
    return { ok: false, error: "Admin role required to delete tickets." };

  const db = getAdminDb();
  let count = 0;
  // Sequential to match original progress UX; Admin SDK has no client-facing
  // batch progress, and small N keeps this fast.
  for (const id of ids) {
    await db.collection(paths.ticketsCollection).doc(id).delete();
    count++;
  }

  await logAction(
    user,
    "TICKET_DELETE",
    `Deleted ${count} ticket(s): ${ids.map((i) => i.slice(0, 6)).join(", ")}`
  );

  revalidatePath("/guests");
  return { ok: true, count };
}

/** Delete a single ticket by id (admin only). For client-side progress loops. */
export async function deleteOneTicket(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.role !== "admin")
    return { ok: false, error: "Admin role required to delete tickets." };

  await getAdminDb().collection(paths.ticketsCollection).doc(id).delete();
  return { ok: true };
}
