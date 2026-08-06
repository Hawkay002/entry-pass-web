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
import { validateTicket, syncOfflineScans, getTicketsForOfflineCache } from "@/app/actions/tickets";
import {
  cacheTickets,
  getCachedTickets,
  markCachedScanned,
  enqueueScan,
  getPendingCount,
  clearPendingScans,
  getPendingScans,
} from "@/lib/offline-db";

// Refresh the offline cache every 5 minutes instead of an always-on realtime
// listener. One snapshot covers ~5 min of scanning; a single ticket lookup at
// validation time catches anything newer. This cuts Firestore reads to a
// fraction of what a live onSnapshot would consume.
const CACHE_REFRESH_MS = 5 * 60 * 1000;

export default function ScannerPage() {
  const lockedTabs = useLockedTabs();
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [haptics, setHaptics] = useState(true);

  // Warm + periodically refresh the IndexedDB ticket cache. One-shot on mount
  // (so the cache is ready immediately), then every 5 minutes. Skipped while
  // offline — the cached snapshot is what we scan against in that case.
  const refreshCache = useCallback(async () => {
    const res = await getTicketsForOfflineCache();
    if (res.ok) await cacheTickets(res.tickets);
  }, []);

  useEffect(() => {
    refreshCache().catch(() => {});
    const interval = setInterval(() => {
      if (navigator.onLine) refreshCache().catch(() => {});
    }, CACHE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshCache]);

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
            scannedBy: res.ticket?.scannedBy,
            scannedAt: res.ticket?.scannedAt,
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
        // Reflect the grant locally so a repeat offline scan returns "already".
        await markCachedScanned(ticketId);
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
    <div className="glass-panel mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Entry Validation</h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={haptics}
            onChange={(e) => setHaptics(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent-secondary"
          />
          Haptic Feedback
        </label>
      </div>

      <div className="text-center">
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

      <QrScanner
        onCode={handleCode}
        haptics={haptics}
        showHapticsToggle={false}
      />
      </div>
    </div>
  );
}
