// app/(app)/guests/page.tsx — Guest List with filter/sort/search/select/delete.

"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { LockedTab } from "@/components/layout/locked-tab";
import { useLockedTabs } from "@/components/layout/locked-tabs-context";
import { Loader2, Search, Trash2, Filter, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTickets } from "@/hooks/use-tickets";
import { useSettings } from "@/hooks/use-settings";
import {
  filterTickets,
  DEFAULT_FILTERS,
  type GuestListFilters,
  type SortKey,
  type StatusFilter,
  type TicketTypeFilter,
  type GenderFilter,
} from "@/lib/guest-list";
import { deleteOneTicket, autoMarkAbsent } from "@/app/actions/tickets";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import type { Ticket, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImportExportButtons } from "@/components/guests/import-export";
import { TicketViewModal } from "@/components/tickets/ticket-view-modal";

const STATUS_STYLES: Record<TicketStatus, string> = {
  "coming-soon": "bg-amber-500/20 text-amber-400",
  arrived: "bg-success-green/20 text-success-green",
  absent: "bg-destructive/20 text-destructive",
};

const TYPE_STYLES: Record<string, string> = {
  Classic: "bg-white/10 text-white",
  Diamond: "bg-[linear-gradient(125deg,#e2e8f0,#94a3b8)] text-[#0f2433]",
  Gold: "bg-[linear-gradient(135deg,#bf953f,#fbf5b7,#aa771c)] text-[#3e2704]",
};

export default function GuestsPage() {
  const lockedTabs = useLockedTabs();
  const { tickets, loading } = useTickets();
  const [filters, setFilters] = useState<GuestListFilters>(DEFAULT_FILTERS);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  // Auto-absent: only polls when there's a deadline set AND coming-soon tickets.
  // Skips entirely when no deadline or all tickets are already arrived/absent.
  const hasComingSoon = tickets.some((t) => t.status === "coming-soon");
  const hasDeadline = !!settings.deadline;

  useEffect(() => {
    if (!hasDeadline || !hasComingSoon) return;
    function check() {
      fetch("/api/auto-absent", { method: "POST" })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.count > 0) {
            toast.success(`Deadline passed — ${res.count} guest(s) marked absent.`);
          }
        })
        .catch(() => {});
    }
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [hasDeadline, hasComingSoon]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(
    () => filterTickets(tickets, filters),
    [tickets, filters]
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((t) => next.delete(t.id));
      } else {
        filtered.forEach((t) => next.add(t.id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelected(new Set());
  }
  function exitSelectionMode() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  async function confirmDelete() {
    const ids = [...selected];
    const total = ids.length;
    setDeleting(true);
    setDeleteProgress(0);

    let deleted = 0;
    for (const id of ids) {
      const res = await deleteOneTicket(id);
      if (res.ok) {
        deleted++;
        setDeleteProgress(Math.round((deleted / total) * 100));
      }
    }

    setDeleting(false);
    setDeleteOpen(false);
    if (deleted > 0) {
      toast.success(`Deleted ${deleted} ticket(s)`);
      exitSelectionMode();
    } else {
      toast.error("Delete failed");
    }
  }

  if (lockedTabs.includes("booked")) {
    return <LockedTab tabName="Guest List" />;
  }

  return (
    <div className="glass-panel space-y-4 p-6">
      <div className="flex items-start justify-between gap-1">
        <h2 className="shrink-0 text-lg font-semibold">Guest List</h2>
        <div className="flex flex-wrap justify-end gap-1.5">
          <ImportExportButtons
            selectedTickets={filtered.filter((t) => selected.has(t.id))}
            allTickets={tickets}
          />
          {selectionMode ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={selected.size === 0}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={enterSelectionMode}>
              Select
            </Button>
          )}
        </div>
      </div>

      {/* Search + filter/sort */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            className="pl-9"
          />
        </div>
        <div ref={filterRef} className="relative shrink-0">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-input/60 px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-input/80"
          >
            <Filter className="h-4 w-4" /> Filter / Sort
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-[40vh] w-56 overflow-y-auto rounded-lg border border-white/10 bg-[#0f0f0f] p-1 shadow-2xl scrollbar-thin">
              <FilterSection label="Ticket Type" />
              {(["all", "Classic", "Diamond", "Gold"] as const).map((v) => (
                <FilterItem
                  key={v}
                  label={
                    v === "all" ? "All Types" : v === "Classic" ? "Classic Only" : v === "Diamond" ? "VIP" : "VVIP"
                  }
                  active={filters.ticketType === v}
                  onClick={() => {
                    setFilters((f) => ({ ...f, ticketType: v as TicketTypeFilter }));
                  }}
                />
              ))}
              <FilterDivider />
              <FilterSection label="Status" />
              {(["all", "arrived", "coming-soon", "absent"] as const).map((v) => (
                <FilterItem
                  key={v}
                  label={v === "all" ? "All Guests" : v === "coming-soon" ? "Coming Soon" : v === "arrived" ? "Arrived Only" : "Absent"}
                  active={filters.status === v}
                  onClick={() => setFilters((f) => ({ ...f, status: v as StatusFilter }))}
                />
              ))}
              <FilterDivider />
              <FilterSection label="Gender" />
              {(["all", "Male", "Female", "Other"] as const).map((v) => (
                <FilterItem
                  key={v}
                  label={v === "all" ? "All Genders" : `${v} Only`}
                  active={filters.gender === v}
                  onClick={() => setFilters((f) => ({ ...f, gender: v as GenderFilter }))}
                />
              ))}
              <FilterDivider />
              <FilterSection label="Sort Order" />
              {([
                ["newest", "Newest First"],
                ["oldest", "Oldest First"],
                ["name-asc", "Name (A-Z)"],
                ["name-desc", "Name (Z-A)"],
                ["age-asc", "Age (Youngest)"],
                ["age-desc", "Age (Oldest)"],
                ["gender", "Gender (Grouped)"],
              ] as const).map(([v, label]) => (
                <FilterItem
                  key={v}
                  label={label}
                  active={filters.sort === v}
                  onClick={() => setFilters((f) => ({ ...f, sort: v as SortKey }))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Select-all bar */}
      {selectionMode && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-sm">Select All</span>
          </div>
          <span className="text-sm text-accent-secondary">
            ({selected.size} selected)
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionMode && <TableHead className="w-10" />}
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Guest Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-center">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading data...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No guests found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t, i) => (
                <TableRow key={t.id}>
                  {selectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggleRow(t.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-center text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        TYPE_STYLES[t.ticketType] ?? TYPE_STYLES.Classic
                      )}
                    >
                      {TICKET_TYPE_LABELS[t.ticketType]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.age} / {t.gender}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.phone}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.id.slice(0, 8)}…
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_STYLES[t.status]
                      )}
                    >
                      {t.status.replace("-", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewTicket(t);
                        setViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirm modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Permanently remove{" "}
              <span className="font-bold text-foreground">{selected.size}</span>{" "}
              entries from the database?
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-2 py-2">
              <Progress value={deleteProgress} />
              <p className="text-right text-xs text-muted-foreground">
                Deleting {Math.round((deleteProgress / 100) * selected.size)} /{" "}
                {selected.size}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketViewModal
        ticket={viewTicket}
        eventName={settings.name || undefined}
        venue={settings.place || undefined}
        open={viewOpen}
        onOpenChange={setViewOpen}
      />
    </div>
  );
}

function FilterSection({ label }: { label: string }) {
  return <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>;
}

function FilterItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10",
        active && "bg-white/10 font-medium text-accent-secondary"
      )}
    >
      {label}
    </button>
  );
}

function FilterDivider() {
  return <div className="my-1 border-t border-white/10" />;
}
