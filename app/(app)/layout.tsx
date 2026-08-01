// app/(app)/layout.tsx — server component. Reads the session cookie,
// redirects to /login if absent, and renders the authenticated shell
// (which includes the staff-side remote-lock listener).
// Also runs the auto-absent check on every request (server-side, immediate).

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAppUser } from "@/lib/firebase/server-auth";
import { isAdmin } from "@/lib/auth";
import { autoMarkAbsent } from "@/app/actions/tickets";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login");

  // Run auto-absent check server-side on every navigation within the app.
  // If the deadline has passed, coming-soon tickets are marked absent immediately.
  await autoMarkAbsent().catch(() => {});

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
