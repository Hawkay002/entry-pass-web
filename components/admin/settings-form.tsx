// components/admin/settings-form.tsx — event name/place/deadline form.

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/hooks/use-settings";
import { saveSettings, clearSettings } from "@/app/actions/admin";

export function SettingsForm() {
  const { settings, loading } = useSettings();
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  async function handleClear() {
    setClearOpen(false);
    const res = await clearSettings();
    if (res.ok) {
      toast.success("Settings cleared");
      setName("");
      setPlace("");
      setDeadline("");
      setEdited(false);
    } else {
      toast.error("Failed to clear settings");
    }
  }

  // Seed local state once settings load.
  if (loading && name === "" && settings.name) {
    setName(settings.name);
    setPlace(settings.place);
    setDeadline(settings.deadline);
  }

  function sync(field: "name" | "place" | "deadline", value: string) {
    setEdited(true);
    if (field === "name") setName(value);
    if (field === "place") setPlace(value);
    if (field === "deadline") setDeadline(value);
  }

  async function handleSave() {
    setSaving(true);
    // Append the user's timezone offset to the deadline so the server
    // (running in UTC on Vercel) interprets it in the user's local time.
    const tzOffset = -new Date().getTimezoneOffset();
    const offsetStr = `${tzOffset >= 0 ? "+" : ""}${String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0")}:${String(Math.abs(tzOffset) % 60).padStart(2, "0")}`;
    const deadlineWithTz = deadline ? deadline + ":00" + offsetStr : deadline;
    const res = await saveSettings({ name, place, deadline: deadlineWithTz });
    setSaving(false);
    if (res.ok) {
      toast.success("Configuration saved");
      setEdited(false);
    } else {
      toast.error("Save failed", { description: res.error });
    }
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="eventName">Event Name</Label>
          <Input
            id="eventName"
            value={name}
            onChange={(e) => sync("name", e.target.value)}
            placeholder="e.g. Summer Gala 2024"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventPlace">Location</Label>
          <Input
            id="eventPlace"
            value={place}
            onChange={(e) => sync("place", e.target.value)}
            placeholder="e.g. Grand Hall"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arrivalDeadline">Deadline</Label>
          <Input
            id="arrivalDeadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => sync("deadline", e.target.value)}
            className="[color-scheme:dark]"
          />
        </div>
        <Button onClick={handleSave} disabled={saving || (!edited && !loading)}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>

        <div className="relative rounded-xl bg-black/30 p-4">
          {(settings.name || settings.place || settings.deadline) && (
            <button
              onClick={() => setClearOpen(true)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
              title="Clear all settings"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <h4 className="mb-2 text-sm font-semibold text-white">Active Settings</h4>
          <p className="text-sm text-muted-foreground">
            <strong>Event:</strong>{" "}
            <span className="text-white">{settings.name || "—"}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Venue:</strong>{" "}
            <span className="text-white">{settings.place || "—"}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Time:</strong>{" "}
            <span className="text-white">
              {settings.deadline
                ? new Date(settings.deadline).toLocaleString()
                : "—"}
            </span>
          </p>
          {settings.deadline && <DeadlineCountdown deadline={settings.deadline} />}
        </div>
      </CardContent>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Settings?</DialogTitle>
            <DialogDescription>
              This will permanently remove the event name, venue, and deadline
              from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState("");
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    function update() {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) {
        setPassed(true);
        setRemaining("");
        return;
      }
      setPassed(false);
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (passed) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Deadline Passed
      </div>
    );
  }

  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Starts in {remaining}
    </div>
  );
}
