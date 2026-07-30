// components/layout/app-header.tsx — top bar: title, notifications bell,
// chat button, user, sign-out.

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

  return (
    <header className="relative z-10 border-b border-white/5 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-light tracking-tight">
          Ticketing<span className="font-semibold">System</span>.
        </h1>
        <div className="flex items-center gap-2">
          {/* Notifications bell */}
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
          {/* Chat button */}
          <button
            onClick={onOpenChat}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Comms Center"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <span className="mx-2 hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <span className="h-2 w-2 rounded-full bg-success-green" />
            <span className="font-semibold text-accent-secondary">{userEmail}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-white"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <AppNav isAdmin={isAdmin} lockedTabs={lockedTabs} />
      </div>
    </header>
  );
}
