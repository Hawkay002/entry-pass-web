// app/(app)/layout.tsx — server component. Reads the session cookie,
// redirects to /login if absent, and renders the authenticated shell.
// Also runs the auto-absent check server-side on every request.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getAppUser } from "@/lib/firebase/server-auth";
import { isAdmin } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";

// Force dynamic rendering — this layout must run on every request,
// not be cached at build time (needed for auto-absent + session checks).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login");

  // Auto-absent: check if deadline passed and mark coming-soon tickets.
  // Runs directly via Admin SDK — no server action dependency.
  try {
    const db = getAdminDb();
    const settingsSnap = await db.doc(paths.settingsDoc).get();
    const deadline = settingsSnap.data()?.deadline as string | undefined;

    if (deadline) {
      const deadlineMs = new Date(deadline).getTime();
      if (!isNaN(deadlineMs) && Date.now() > deadlineMs) {
        const snap = await db
          .collection(paths.ticketsCollection)
          .where("status", "==", "coming-soon")
          .get();

        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((d) => batch.update(d.ref, { status: "absent" }));
          await batch.commit();
          console.log(`[auto-absent] Marked ${snap.size} ticket(s) as absent`);
        }
      }
    }
  } catch (err) {
    console.error("[auto-absent] failed:", err);
  }

  return (
    <AppShell
      isAdmin={isAdmin(user)}
      userEmail={user.email ?? "—"}
      username={user.username}
    >
      {children}
    </AppShell>
  );
}
