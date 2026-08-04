// app/api/auto-absent/route.ts — standalone API endpoint for auto-absent.
// Called by the Guest List page on mount. This avoids any layout caching issues.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAppUser } from "@/lib/firebase/server-auth";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const settingsSnap = await db.doc(paths.settingsDoc).get();
    const deadline = settingsSnap.data()?.deadline as string | undefined;

    if (!deadline) {
      return NextResponse.json({ ok: true, count: 0, reason: "no deadline" });
    }

    const deadlineMs = new Date(deadline).getTime();
    if (isNaN(deadlineMs) || Date.now() <= deadlineMs) {
      return NextResponse.json({ ok: true, count: 0, reason: "not passed" });
    }

    // Deadline passed — mark coming-soon as absent.
    const snap = await db
      .collection(paths.ticketsCollection)
      .where("status", "==", "coming-soon")
      .get();

    if (snap.empty) {
      return NextResponse.json({ ok: true, count: 0, reason: "none to mark" });
    }

    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { status: "absent" }));
    await batch.commit();

    console.log(`[auto-absent] ✅ Marked ${snap.size} ticket(s) as absent`);
    return NextResponse.json({ ok: true, count: snap.size });
  } catch (err) {
    console.error("[auto-absent] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
