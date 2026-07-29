// components/layout/app-nav.tsx — primary tab navigation.
// "Activity Logs" is admin-only. Locked tabs (Phase 2 remote lock) will
// grey out via a `lockedTabs` prop passed from the app layout.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabName } from "@/lib/types";

interface NavTab {
  href: string;
  label: string;
  tabKey?: TabName; // present when this tab can be remotely locked
  adminOnly?: boolean;
}

const TABS: NavTab[] = [
  { href: "/tickets", label: "Issue Ticket", tabKey: "create" },
  { href: "/guests", label: "Guest List", tabKey: "booked" },
  { href: "/scanner", label: "Scanner", tabKey: "scanner" },
  { href: "/settings", label: "Configuration" },
  { href: "/logs", label: "Activity Logs", adminOnly: true },
];

export function AppNav({
  isAdmin,
  lockedTabs = [],
}: {
  isAdmin: boolean;
  lockedTabs?: TabName[];
}) {
  const pathname = usePathname();

  const visible = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {visible.map((tab) => {
        const locked =
          tab.tabKey !== undefined && lockedTabs.includes(tab.tabKey);
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={locked ? "#" : tab.href}
            aria-disabled={locked || undefined}
            onClick={(e) => {
              if (locked) e.preventDefault();
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-white text-black"
                : "text-muted-foreground hover:bg-white/5 hover:text-white",
              locked && "cursor-not-allowed opacity-40 hover:bg-transparent"
            )}
          >
            {locked && <Lock className="h-3.5 w-3.5" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
