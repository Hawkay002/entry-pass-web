// app/api/kiosk-checkin/route.ts — public self check-in endpoint for the
// kiosk tablet. Gated by a PIN set by the admin (stored in the admin-only
// security doc, never sent to the client SDK). Mirrors validateTicket's
// idempotent logic but attributes scans to "KIOSK" and logs SELF_CHECKIN.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { logKioskAction } from "@/lib/redis-log";

export const dynamic = "force-dynamic";

type CheckinResponse =
  | { ok: true; outcome: "granted" | "already" | "invalid"; ticket: { name: string; id: string; status: string } | null }
  | { ok: false; error: string };

export async function POST(request: Request): Promise<Response> {
  let body: { pin?: unknown; ticketId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<CheckinResponse>(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const pin = typeof body.pin === "string" ? body.pin.replace(/\D/g, "") : "";
  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";

  if (!pin || !ticketId) {
    return NextResponse.json<CheckinResponse>(
      { ok: false, error: "PIN and ticketId are required." },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();

    // Verify the PIN against the admin-only security doc.
    const secSnap = await db.doc(paths.adminSecurityDoc).get();
    const configuredPin = (secSnap.data()?.kioskPin as string | undefined) ?? "";
    if (configuredPin.length < 4 || pin !== configuredPin) {
      // Same response for missing/mismatch to avoid PIN enumeration.
      return NextResponse.json<CheckinResponse>(
        { ok: false, error: "Kiosk is not available. Contact the event organizer." },
        { status: 403 }
      );
    }

    // Look up the ticket (Admin SDK bypasses firestore.rules).
    const ref = db.collection(paths.ticketsCollection).doc(ticketId);
    const snap = await ref.get();

    if (!snap.exists) {
      await logKioskAction("SELF_CHECKIN", `Invalid self check-in: ${ticketId.slice(0, 8)}`);
      return NextResponse.json<CheckinResponse>({
        ok: true,
        outcome: "invalid",
        ticket: null,
      });
    }

    const data = snap.data() as Record<string, unknown>;
    const name = String(data.name ?? "");
    const status = String(data.status ?? "coming-soon");
    const scanned = Boolean(data.scanned);

    // Idempotent: only grant if still coming-soon & unscanned.
    if (status === "coming-soon" && !scanned) {
      await ref.update({
        status: "arrived",
        scanned: true,
        scannedAt: Date.now(),
        scannedBy: "KIOSK",
      });
      await logKioskAction(
        "SELF_CHECKIN",
        `Self check-in: ${name} (ID: ${ticketId.slice(0, 6)})`
      );
      return NextResponse.json<CheckinResponse>({
        ok: true,
        outcome: "granted",
        ticket: { name, id: ticketId, status: "arrived" },
      });
    }

    // Already scanned or otherwise not grantable — report without mutating.
    return NextResponse.json<CheckinResponse>({
      ok: true,
      outcome: "already",
      ticket: { name, id: ticketId, status },
    });
  } catch (err) {
    console.error("[kiosk-checkin] ERROR:", err);
    return NextResponse.json<CheckinResponse>(
      { ok: false, error: "Check-in failed. Please try again." },
      { status: 500 }
    );
  }
}
