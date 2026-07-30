// app/(app)/layout.tsx — server component. Reads the session cookie,
// redirects to /login if absent, and renders the authenticated shell
// (which includes the staff-side remote-lock listener).

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAppUser } from "@/lib/firebase/server-auth";
import { isAdmin } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login");

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
