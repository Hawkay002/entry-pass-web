// components/layout/app-header.tsx — top bar: title, user, sign-out.

"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppNav } from "./app-nav";
import type { TabName } from "@/lib/types";

export function AppHeader({
  isAdmin,
  userEmail,
  lockedTabs = [],
}: {
  isAdmin: boolean;
  userEmail: string;
  lockedTabs?: TabName[];
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
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden items-center gap-2 text-muted-foreground sm:flex">
            <span className="h-2 w-2 rounded-full bg-success-green" />
            User:{" "}
            <span className="font-semibold text-accent-secondary">
              {userEmail}
            </span>
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
