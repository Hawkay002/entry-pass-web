// app/(app)/layout.tsx — server component. Reads the session cookie,
// redirects to /login if absent, and renders the authenticated shell.
//
// The (app) route group covers all protected pages: tickets, guests,
// scanner, settings, logs.

import { redirect } from "next/navigation";
import { Starfield } from "@/components/layout/starfield";
import { AppHeader } from "@/components/layout/app-header";
import { getAppUser } from "@/lib/firebase/server-auth";
import { isAdmin } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login");

  // Remote-lock listening (Phase 2) will pass lockedTabs down to the header
  // via a client context; for now the header receives an empty array.
  return (
    <div className="relative min-h-screen">
      <Starfield />
      <div className="relative z-10">
        <AppHeader
          isAdmin={isAdmin(user)}
          userEmail={user.email ?? "—"}
          lockedTabs={[]}
        />
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
