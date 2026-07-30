// app/(app)/settings/page.tsx — Configuration (event settings form +
// live display). Admin sees the Remote Lock + Staff management panels below.

import { getAppUser } from "@/lib/firebase/server-auth";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPanels } from "@/components/admin/admin-panels";

export default async function SettingsPage() {
  const user = await getAppUser();
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SettingsForm />
      {isAdmin && <AdminPanels />}
    </div>
  );
}
