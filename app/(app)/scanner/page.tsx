// app/(app)/scanner/page.tsx — QR scanner with camera + jsQR decoding.
// Uses the shared <QrScanner>. Validates via the validateTicket server action
// when online, and against a warm IndexedDB cache when offline, queuing scans
// for sync on reconnect.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff, CloudUpload } from "lucide-react";
import { LockedTab } from "@/components/layout/locked-tab";
import { useLockedTabs } from "@/components/layout/locked-tabs-context";
import { QrScanner, type ScanOutcome } from "@/components/scanner/qr-scanner";
import { validateTicket, syncOfflineScans } from "@/app/actions/tickets";
import { useTickets } from "@/hooks/use-tickets";
import {
  cacheTickets,
  getCachedTickets,
  enqueueScan,
  getPendingCount,
  clearPendingScans,
  getPendingScans,
} from "@/lib/offline-db";

export default function ScannerPage() {
  const lockedTabs = useLockedTabs();
  const { tickets } = useTickets();
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Keep the IndexedDB ticket cache warm while the scanner page is open.
  useEffect(() => {
    if (tickets.length > 0) {
      cacheTickets(tickets).catch(() => {});
    }
  }, [tickets]);

  // Drain the offline queue when connectivity returns.
  const drainQueue = useCallback(async () => {
    const queued = await getPendingScans();
    if (queued.length === 0) return;
    setSyncing(true);
    try {
      const res = await syncOfflineScans(queued.map((q) => q.id));
      if (res.ok) {
        const granted = Object.values(res.results).filter((r) => r === "granted").length;
        const already = Object.values(res.results).filter((r) => r === "already").length;
        await clearPendingScans(queued.map((q) => q.id));
        setPending(0);
        if (granted > 0 || already > 0) {
          toast.success(`Synced ${granted + already} offline scan(s)`, {
            description:
              already > 0 ? `${already} were already scanned by staff.` : undefined,
          });
        }
      } else {
        toast.error("Sync failed", { description: res.error });
      }
    } catch (err) {
      toast.error("Sync failed", { description: (err as Error).message });
    }
    setSyncing(false);
  }, []);

  // Track connection state + drain the queue the moment we reconnect.
  // setState happens in event callbacks (allowed), not in the effect body.
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      drainQueue();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [drainQueue]);

  // Refresh the pending count on mount (async — no synchronous setState).
  useEffect(() => {
    getPendingCount()
      .then(setPending)
      .catch(() => {});
  }, []);

  // Validate a decoded QR — online via server action, offline via cache.
  const handleCode = useCallback(
    async (ticketId: string): Promise<ScanOutcome> => {
      if (online) {
        const res = await validateTicket(ticketId);
        if (!res.ok) return { kind: "error", message: res.error };
        if (res.outcome === "granted")
          return { kind: "granted", name: res.ticket?.name ?? "", id: ticketId };
        if (res.outcome === "already")
          return {
            kind: "already",
            name: res.ticket?.name ?? "",
            id: ticketId,
            status: res.ticket?.status ?? "",
          };
        return { kind: "invalid", id: ticketId };
      }

      // Offline: validate against the IndexedDB cache.
      const cached = await getCachedTickets();
      const t = cached.find((x) => x.id === ticketId);
      if (!t) {
        return {
          kind: "error",
          message: "Ticket not found in offline cache. Reconnect to verify.",
        };
      }
      if (t.status === "coming-soon" && !t.scanned) {
        await enqueueScan({ id: ticketId, name: t.name, timestamp: Date.now() });
        setPending((p) => p + 1);
        return { kind: "granted", name: t.name, id: ticketId };
      }
      return {
        kind: "already",
        name: t.name,
        id: ticketId,
        status: t.status,
      };
    },
    [online]
  );

  if (lockedTabs.includes("scanner")) {
    return <LockedTab tabName="Scanner" />;
  }

  return (
    <div className="glass-panel mx-auto max-w-lg p-6 text-center">
      <h2 className="mb-4 text-lg font-semibold">Entry Validation</h2>

      {/* Offline / sync status banner */}
      {!online && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          <WifiOff className="h-4 w-4" />
          Offline mode — scans are saved locally and will sync automatically.
        </div>
      )}
      {online && pending > 0 && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          <CloudUpload className={syncing ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          {syncing
            ? `Syncing ${pending} scan(s)…`
            : `${pending} scan(s) pending sync`}
        </div>
      )}

      <QrScanner onCode={handleCode} />
    </div>
  );
}
