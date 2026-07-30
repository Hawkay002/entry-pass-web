// app/(app)/guests/page.tsx — Guest List with filter/sort/search/select/delete.

"use client";

import { useMemo, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteTickets } from "@/app/actions/tickets";
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
  const { tickets, loading } = useTickets();
  const [filters, setFilters] = useState<GuestListFilters>(DEFAULT_FILTERS);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const { settings } = useSettings();

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
    setDeleting(true);
    setDeleteProgress(0);
    const res = await deleteTickets(ids);
    setDeleting(false);
    setDeleteOpen(false);
    if (res.ok) {
      toast.success(`Deleted ${res.count} ticket(s)`);
      exitSelectionMode();
    } else {
      toast.error("Delete failed", { description: res.error });
    }
  }

  return (
    <div className="glass-panel space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Guest List</h2>
        <div className="flex flex-wrap gap-2">
          <ImportExportButtons
            selectedTickets={filtered.filter((t) => selected.has(t.id))}
            allTickets={tickets}
          />
          {selectionMode ? (
            <>
              <span className="self-center text-sm text-accent-secondary">
                ({selected.size} selected)
              </span>
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Filter className="mr-1.5 h-4 w-4" /> Filter / Sort
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Ticket Type</DropdownMenuLabel>
            <FilterRow
              options={[
                ["all", "All Types"],
                ["Classic", "Classic Only"],
                ["Diamond", "VIP"],
                ["Gold", "VVIP"],
              ]}
              value={filters.ticketType}
              onPick={(v) =>
                setFilters((f) => ({
                  ...f,
                  ticketType: v as TicketTypeFilter,
                }))
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <FilterRow
              options={[
                ["all", "All Guests"],
                ["arrived", "Arrived Only"],
                ["coming-soon", "Coming Soon"],
                ["absent", "Absent"],
              ]}
              value={filters.status}
              onPick={(v) =>
                setFilters((f) => ({ ...f, status: v as StatusFilter }))
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Gender</DropdownMenuLabel>
            <FilterRow
              options={[
                ["all", "All Genders"],
                ["Male", "Male Only"],
                ["Female", "Female Only"],
                ["Other", "Other"],
              ]}
              value={filters.gender}
              onPick={(v) =>
                setFilters((f) => ({ ...f, gender: v as GenderFilter }))
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
            <FilterRow
              options={[
                ["newest", "Newest First"],
                ["oldest", "Oldest First"],
                ["name-asc", "Name (A-Z)"],
                ["name-desc", "Name (Z-A)"],
                ["age-asc", "Age (Youngest)"],
                ["age-desc", "Age (Oldest)"],
                ["gender", "Gender (Grouped)"],
              ]}
              value={filters.sort}
              onPick={(v) =>
                setFilters((f) => ({ ...f, sort: v as SortKey }))
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Select-all bar */}
      {selectionMode && (
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
          <span className="text-sm">Select All</span>
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
              <TableHead className="w-10"></TableHead>
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
                Deleting...
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
        open={viewOpen}
        onOpenChange={setViewOpen}
      />
    </div>
  );
}

function FilterRow({
  options,
  value,
  onPick,
}: {
  options: [string, string][];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <>
      {options.map(([v, label]) => (
        <DropdownMenuItem
          key={v}
          onClick={() => onPick(v)}
          className={cn(v === value && "bg-white/10 font-medium")}
        >
          {label}
        </DropdownMenuItem>
      ))}
    </>
  );
}
