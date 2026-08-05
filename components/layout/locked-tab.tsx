// components/layout/locked-tab.tsx — shows a "tab locked" screen instead of
// the page content when the current tab is in the user's lockedTabs list.

import { Lock } from "lucide-react";

export function LockedTab({ tabName }: { tabName: string }) {
  return (
    <div className="glass-panel flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
        <Lock className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">{tabName} is Locked</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This tab has been restricted by the administrator. You don&apos;t have
        access to this feature right now. If you believe this is a mistake,
        please contact the administrator.
      </p>
    </div>
  );
}
