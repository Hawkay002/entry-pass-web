// app/api/kiosk-tickets/route.ts — public, PIN-gated fetch of the minimal
// ticket list for the kiosk's offline cache. Returns ONLY id + status + scanned
// (NO names, phones, or other PII) so a public tablet can validate QR codes
// offline without exposing guest data. Same PIN gate + rate limit as check-in.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { getClientIp, recordFailure, clearRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const FAIL_LIMIT = 5;
const FAIL_WINDOW_SEC = 5 * 60;

type TicketsResponse =
  | { ok: true; tickets: { id: string; status: string; scanned: boolean }[] }
  | { ok: false; error: string };

export async function POST(request: Request): Promise<Response> {
  let body: { pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<TicketsResponse>(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const pin = typeof body.pin === "string" ? body.pin.replace(/\D/g, "") : "";
  if (!pin) {
    return NextResponse.json<TicketsResponse>(
      { ok: false, error: "PIN is required." },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();
    const ip = getClientIp(request);
    const failKey = `kiosk_fail:${ip}`;

    // Verify the PIN against the admin-only security doc.
    const secSnap = await db.doc(paths.adminSecurityDoc).get();
    const configuredPin = (secSnap.data()?.kioskPin as string | undefined) ?? "";
    const pinCorrect = configuredPin.length >= 4 && pin === configuredPin;

    if (!pinCorrect) {
      const state = await recordFailure(failKey, FAIL_LIMIT, FAIL_WINDOW_SEC);
      if (state.blocked) {
        return NextResponse.json<TicketsResponse>(
          { ok: false, error: "Too many failed attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": String(state.retryAfter) } }
        );
      }
      return NextResponse.json<TicketsResponse>(
        { ok: false, error: "Kiosk is not available. Contact the event organizer." },
        { status: 403 }
      );
    }

    await clearRateLimit(failKey);

    // Return ONLY the minimal fields needed for offline validation. No PII.
    const snap = await db.collection(paths.ticketsCollection).get();
    const tickets = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        status: String(data.status ?? "coming-soon"),
        scanned: Boolean(data.scanned),
      };
    });

    return NextResponse.json<TicketsResponse>({ ok: true, tickets });
  } catch (err) {
    console.error("[kiosk-tickets] ERROR:", err);
    return NextResponse.json<TicketsResponse>(
      { ok: false, error: "Failed to load tickets." },
      { status: 500 }
    );
  }
}
