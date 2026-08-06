// app/(app)/layout.tsx — server component. Reads the session cookie,
// redirects to /login if absent, and renders the authenticated shell.
// Also runs the auto-absent check server-side on every request.

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAppUser } from "@/lib/firebase/server-auth";
import { isAdmin } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login?reason=expired");

  // Auto-absent: check if deadline passed and mark coming-soon tickets.
  // Runs directly via Admin SDK — no server action dependency.
  // Intentionally NOT in a try/catch so errors show in Vercel logs.
  const db = getAdminDb();
  const settingsSnap = await db.doc(paths.settingsDoc).get();
  const settingsData = settingsSnap.data();
  const deadline = settingsData?.deadline as string | undefined;

  if (deadline) {
    const deadlineMs = new Date(deadline).getTime();
    // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is fine here
    const now = Date.now();

    if (!isNaN(deadlineMs) && now > deadlineMs) {
      const snap = await db
        .collection(paths.ticketsCollection)
        .where("status", "==", "coming-soon")
        .get();

      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((d) => batch.update(d.ref, { status: "absent" }));
        await batch.commit();
      }
    }
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
