// components/admin/admin-panels.tsx — admin-only section: Remote Lock,
// Staff management, and Factory Reset. Admin role is enforced server-side
// by the page; this component assumes admin.

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  fetchStaffUsers,
  createStaffUser,
  deleteStaffUser,
  factoryReset,
  applyRemoteLocks,
} from "@/app/actions/admin";
import type { LockReasonType, Role, StaffUser, TabName } from "@/lib/types";
import { cn } from "@/lib/utils";

const MANAGED_EMAILS = [
  "eveman.test@gmail.com",
  "regdesk.test@gmail.com",
  "sechead.test@gmail.com",
];
const ROLES: Role[] = [
  "event_manager",
  "registration_desk",
  "security_head",
];
const LOCKABLE_TABS: { value: TabName; label: string }[] = [
  { value: "create", label: "Issue Ticket Tab" },
  { value: "booked", label: "Guest List Tab" },
  { value: "scanner", label: "Scanner Tab" },
];

export function AdminPanels() {
  return (
    <div className="space-y-10 border-t border-white/5 pt-8">
      <RemoteLockPanel />
      <StaffManagementPanel />
      <FactoryResetPanel />
    </div>
  );
}

// ============== Remote Lock ==============

function RemoteLockPanel() {
  const [targetEmail, setTargetEmail] = useState<string | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [lockedTabs, setLockedTabs] = useState<Set<TabName>>(new Set());
  const [reason, setReason] = useState<LockReasonType>("basic");
  const [maintHrs, setMaintHrs] = useState("");
  const [maintMins, setMaintMins] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  async function selectEmail(email: string) {
    setTargetEmail(email);
    setSelectedUsernames(new Set());
    setLockedTabs(new Set());
    setReason("basic");
    const res = await fetchStaffUsers();
    if (res.ok) {
      setUsers(res.users.filter((u) => u.email === email));
    }
  }

  function toggleUsername(u: string) {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      next.has(u) ? next.delete(u) : next.add(u);
      return next;
    });
  }
  function toggleTab(t: TabName) {
    setLockedTabs((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function durationString(): string | null {
    if (reason !== "maintenance") return null;
    const h = Number(maintHrs) || 0;
    const m = Number(maintMins) || 0;
    if (h === 0 && m === 0) return "Unknown";
    let s = "";
    if (h > 0) s += `${h} hr `;
    if (m > 0) s += `${m} min`;
    return s.trim() || "Unknown";
  }

  async function confirmLock() {
    if (!targetEmail || selectedUsernames.size === 0) return;
    setApplying(true);
    const res = await applyRemoteLocks({
      targetEmail,
      usernames: [...selectedUsernames],
      lockedTabs: [...lockedTabs],
      reason,
      duration: durationString(),
    });
    setApplying(false);
    setModalOpen(false);
    if (res.ok) {
      const n = lockedTabs.size;
      toast.success(
        n > 0
          ? `Locked ${n} tab(s) for ${selectedUsernames.size} user(s)`
          : `Access restored for ${selectedUsernames.size} user(s)`
      );
    } else {
      toast.error("Lock failed", { description: res.error });
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-5 w-5 text-accent-secondary" />
        <h3 className="text-lg font-semibold">Remote Device Management</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Lock specific tabs for staff members. Enforcement is applied in real time.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {MANAGED_EMAILS.map((email) => (
          <button
            key={email}
            onClick={() => selectEmail(email)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              targetEmail === email
                ? "border-accent-secondary bg-accent-secondary/10"
                : "border-white/10 hover:bg-white/5"
            )}
          >
            <p className="text-sm font-medium">{email.split("@")[0]}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </button>
        ))}
      </div>

      {targetEmail && (
        <div className="mt-4 rounded-xl bg-white/5 p-4">
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Select Users
          </h4>
          {users.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              No usernames found for this account. Create staff users below first.
            </p>
          ) : (
            <div className="mb-4 flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.username}
                  onClick={() => toggleUsername(u.username)}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm transition-colors",
                    selectedUsernames.has(u.username)
                      ? "bg-accent-secondary text-white"
                      : "bg-white/10 text-muted-foreground hover:bg-white/20"
                  )}
                >
                  {u.username}
                </button>
              ))}
            </div>
          )}

          {selectedUsernames.size > 0 && (
            <>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Restrict Tabs
              </h4>
              <div className="mb-4 space-y-2">
                {LOCKABLE_TABS.map((tab) => (
                  <label
                    key={tab.value}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={lockedTabs.has(tab.value)}
                      onCheckedChange={() => toggleTab(tab.value)}
                    />
                    {tab.label}
                  </label>
                ))}
              </div>

              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Lock Reason
              </h4>
              <RadioGroup
                value={reason}
                onValueChange={(v) => setReason(v as LockReasonType)}
                className="mb-4 flex gap-4"
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="basic" /> Basic
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="maintenance" /> Maintenance
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="suspension" /> Review
                </label>
              </RadioGroup>

              {reason === "maintenance" && (
                <div className="mb-4 flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Hrs"
                      value={maintHrs}
                      onChange={(e) => setMaintHrs(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Mins"
                      value={maintMins}
                      onChange={(e) => setMaintMins(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button variant="destructive" onClick={() => setModalOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Sync &amp; Lock ({selectedUsernames.size} user
                {selectedUsernames.size > 1 ? "s" : ""})
              </Button>
            </>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure Remote User</DialogTitle>
            <DialogDescription>
              Target:{" "}
              <span className="font-mono text-accent-secondary">
                {targetEmail}
              </span>
              <br />
              {lockedTabs.size} tab(s) restricted for {selectedUsernames.size} user(s).
              Reason: {reason}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={applying}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmLock} disabled={applying}>
              {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sync &amp; Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Staff Management ==============

function StaffManagementPanel() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    realName: "",
    role: "event_manager" as Role,
    email: "eveman.test@gmail.com",
  });

  async function load() {
    const res = await fetchStaffUsers();
    if (res.ok) setUsers(res.users);
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    fetchStaffUsers().then((res) => {
      if (!active) return;
      if (res.ok) setUsers(res.users);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate() {
    const res = await createStaffUser(form);
    if (res.ok) {
      toast.success("Staff user created");
      setOpen(false);
      setForm({ username: "", realName: "", role: "event_manager", email: "eveman.test@gmail.com" });
      load();
    } else {
      toast.error("Create failed", { description: res.error });
    }
  }

  async function handleDelete(username: string) {
    const res = await deleteStaffUser(username);
    if (res.ok) {
      toast.success(`Deleted ${username}`);
      load();
    } else {
      toast.error("Delete failed", { description: res.error });
    }
  }

  return (
    <div className="border-t border-white/5 pt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Staff Users</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No staff users yet. Click &quot;Add Staff&quot; to create one.
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.username}
              className="flex items-center justify-between rounded-lg bg-white/5 p-3"
            >
              <div>
                <p className="text-sm font-medium">{u.username}</p>
                <p className="text-xs text-muted-foreground">
                  {u.realName} · {u.role} · {u.email}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(u.username)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="su-username">Username</Label>
              <Input
                id="su-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. john_doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-realname">Real Name</Label>
              <Input
                id="su-realname"
                value={form.realName}
                onChange={(e) => setForm({ ...form, realName: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: (v ?? "") as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked Account</Label>
              <Select
                value={form.email}
                onValueChange={(v) => setForm({ ...form, email: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANAGED_EMAILS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!form.username.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Factory Reset ==============

function FactoryResetPanel() {
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    const res = await factoryReset();
    setResetting(false);
    if (res.ok) {
      toast.success("System reset complete");
      setOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast.error("Reset failed", { description: res.error });
    }
  }

  return (
    <div className="border-t border-white/5 pt-8 text-center">
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-destructive text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="mr-2 h-4 w-4" /> Factory Reset Database
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠ Danger Zone</DialogTitle>
            <DialogDescription>
              This will <strong>permanently erase</strong> all tickets, settings,
              and lock configurations. An immutable audit record will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nuke Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
