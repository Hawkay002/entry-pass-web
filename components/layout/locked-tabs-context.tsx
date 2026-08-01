// components/layout/locked-tabs-context.tsx — provides lockedTabs to all pages.
"use client";

import { createContext, useContext } from "react";
import type { TabName } from "@/lib/types";

const LockedTabsContext = createContext<TabName[]>([]);

export function LockedTabsProvider({
  lockedTabs,
  children,
}: {
  lockedTabs: TabName[];
  children: React.ReactNode;
}) {
  return (
    <LockedTabsContext.Provider value={lockedTabs}>
      {children}
    </LockedTabsContext.Provider>
  );
}

export function useLockedTabs(): TabName[] {
  return useContext(LockedTabsContext);
}
