// components/layout/app-header.tsx — top bar.
// Mobile: centered title + wrapped account/signout, actions on right edge.
// Desktop: original single-row layout (title left, actions right).

"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppNav } from "./app-nav";
import type { TabName } from "@/lib/types";

export function AppHeader({
  isAdmin,
  userEmail,
  lockedTabs = [],
  unreadCount = 0,
  onOpenNotifications,
  onOpenChat,
}: {
  isAdmin: boolean;
  userEmail: string;
  lockedTabs?: TabName[];
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenChat?: () => void;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  const bell = (
    <button
      onClick={onOpenNotifications}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-secondary px-1 text-[0.6rem] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );

  const chat = (
    <button
      onClick={onOpenChat}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
      aria-label="Comms Center"
    >
      <MessageCircle className="h-4 w-4" />
    </button>
  );

  const signOutBtn = (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      className="text-muted-foreground hover:text-white"
    >
      <LogOut className="mr-1.5 h-4 w-4" />
      Sign Out
    </Button>
  );

  const accountInline = (
    <span className="mx-2 hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
      <span className="h-2 w-2 rounded-full bg-success-green" />
      <span className="font-semibold text-accent-secondary">{userEmail}</span>
    </span>
  );

  return (
    <header className="relative z-10 border-b border-white/5 px-6 py-4">
      {/* ===== MOBILE: centered title + wrapped account, actions right ===== */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Top row: spacer | centered title | actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-16 shrink-0" />
          <h1 className="text-3xl font-light tracking-tight">
            Ticketing<span className="font-semibold">System</span>.
          </h1>
          <div className="flex w-16 shrink-0 items-center justify-end gap-1">
            {bell}
            {chat}
          </div>
        </div>
        {/* Account + signout wrapper, centered */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1 text-sm">
            <span className="h-2 w-2 rounded-full bg-success-green" />
            <span className="font-semibold text-accent-secondary">{userEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-7 px-2 text-muted-foreground hover:text-white"
            >
              <LogOut className="mr-1 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP: original single-row layout ===== */}
      <div className="hidden items-center justify-between gap-4 sm:flex">
        <h1 className="text-3xl font-light tracking-tight">
          Ticketing<span className="font-semibold">System</span>.
        </h1>
        <div className="flex items-center gap-2">
          {bell}
          {chat}
          {accountInline}
          {signOutBtn}
        </div>
      </div>

      {/* Nav (shared) */}
      <div className="mt-4 flex justify-center">
        <AppNav isAdmin={isAdmin} lockedTabs={lockedTabs} />
      </div>
    </header>
  );
}
