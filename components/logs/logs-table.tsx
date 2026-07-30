// components/logs/logs-table.tsx — client filter/search/select/delete for logs.

"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { deleteLogs } from "@/app/actions/admin";
import type { ActivityLog, LogAction } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Logins",
  TICKET_CREATE: "Ticket Issues",
  SCAN_ENTRY: "Scans",
  CONFIG_CHANGE: "Settings",
  HELP_CALL: "Help Calls",
  TICKET_DELETE: "Ticket Deletions",
  FACTORY_RESET: "Factory Resets",
  LOCK_ACTION: "Admin Locks",
  LOG_DELETE: "Log Deletions",
  EXPORT_DATA: "Data Exports",
  IMPORT_DATA: "Import Data",
};

const ACTION_FILTERS = [
  "LOGIN",
  "TICKET_CREATE",
  "SCAN_ENTRY",
  "CONFIG_CHANGE",
  "HELP_CALL",
  "TICKET_DELETE",
  "FACTORY_RESET",
  "LOCK_ACTION",
  "LOG_DELETE",
  "EXPORT_DATA",
  "IMPORT_DATA",
] as const;

export function LogsTable({ initialLogs }: { initialLogs: ActivityLog[] }) {
  const [logs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (!term) return true;
      return (
        l.username.toLowerCase().includes(term) ||
        l.userEmail.toLowerCase().includes(term) ||
        l.action.toLowerCase().includes(term) ||
        l.details.toLowerCase().includes(term)
      );
    });
  }, [logs, search, actionFilter]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((l) => next.delete(l.id));
      else filtered.forEach((l) => next.add(l.id));
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

  async function confirmDelete() {
    const ids = [...selected];
    setDeleting(true);
    const res = await deleteLogs(ids);
    setDeleting(false);
    if (res.ok) {
      toast.success(`Deleted ${res.count} log(s)`);
      setSelected(new Set());
      setSelectionMode(false);
      // Refresh server data.
      window.location.reload();
    } else {
      toast.error("Delete failed", { description: res.error });
    }
  }

  return (
    <div className="glass-panel space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Activity Logs</h2>
        <div className="flex gap-2">
          {selectionMode ? (
            <>
              <span className="self-center text-sm text-accent-secondary">
                ({selected.size} selected)
              </span>
              <Button
                size="sm"
                variant="destructive"
                disabled={selected.size === 0 || deleting}
                onClick={confirmDelete}
              >
                {deleting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-4 w-4" />
                )}
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectionMode(false); setSelected(new Set()); }}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setSelectionMode(true)}>
              Select
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                Type
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by Action</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setActionFilter("all")}
              className={cn(actionFilter === "all" && "bg-white/10 font-medium")}
            >
              All Actions
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {ACTION_FILTERS.map((a) => (
              <DropdownMenuItem
                key={a}
                onClick={() => setActionFilter(a)}
                className={cn(actionFilter === a && "bg-white/10 font-medium")}
              >
                {ACTION_LABELS[a]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectionMode && (
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
          <span className="text-sm">Select All</span>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionMode && <TableHead className="w-10" />}
              <TableHead className="w-44">Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  {selectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={() => toggleRow(l.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {new Date(l.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {l.username}
                    <span className="block text-xs text-muted-foreground">
                      {l.userEmail}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                      {l.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.details}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
