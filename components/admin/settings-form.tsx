// components/admin/settings-form.tsx — event name/place/deadline form.

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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

/** Common timezones with their UTC offsets (value = offset string for ISO date). */
const TIMEZONES: { label: string; offset: string }[] = [
  { label: "Local (auto-detect)", offset: "auto" },
  { label: "IST — India (UTC+5:30)", offset: "+05:30" },
  { label: "GMT — UK (UTC+0)", offset: "+00:00" },
  { label: "CET — Central Europe (UTC+1)", offset: "+01:00" },
  { label: "EET — Eastern Europe (UTC+2)", offset: "+02:00" },
  { label: "GST — Gulf (UTC+4)", offset: "+04:00" },
  { label: "PKT — Pakistan (UTC+5)", offset: "+05:00" },
  { label: "BST — Bangladesh (UTC+6)", offset: "+06:00" },
  { label: "ICT — Indonesia (UTC+7)", offset: "+07:00" },
  { label: "CST — China/Singapore (UTC+8)", offset: "+08:00" },
  { label: "JST — Japan (UTC+9)", offset: "+09:00" },
  { label: "ACST — Australia Central (UTC+9:30)", offset: "+09:30" },
  { label: "AEST — Australia East (UTC+10)", offset: "+10:00" },
  { label: "NZST — New Zealand (UTC+12)", offset: "+12:00" },
  { label: "EST — US East (UTC-5)", offset: "-05:00" },
  { label: "CST-US — US Central (UTC-6)", offset: "-06:00" },
  { label: "MST — US Mountain (UTC-7)", offset: "-07:00" },
  { label: "PST — US Pacific (UTC-8)", offset: "-08:00" },
  { label: "AKST — Alaska (UTC-9)", offset: "-09:00" },
  { label: "HST — Hawaii (UTC-10)", offset: "-10:00" },
  { label: "BRT — Brazil (UTC-3)", offset: "-03:00" },
  { label: "ART — Argentina (UTC-3)", offset: "-03:00" },
];

export function SettingsForm() {
  const { settings, loading } = useSettings();
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tz, setTz] = useState("+05:30");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);

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

  // Seed local state once when settings first arrive (not during render).
  useEffect(() => {
    if (!loading && !seeded && (settings.name || settings.place || settings.deadline)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time seed from server data
      setName(settings.name);
      setPlace(settings.place);
      // Strip any existing timezone offset so datetime-local shows a clean value.
      // "2026-08-04T17:00:00+05:30" → "2026-08-04T17:00"
      const cleanDeadline = settings.deadline
        ? settings.deadline.replace(/[+-]\d{2}:\d{2}(:\d{2})?$/, "").replace(/:\d{2}$/, "")
        : "";
      setDeadline(cleanDeadline);
      if (settings.timezone) setTz(settings.timezone);
      setSeeded(true);
    }
  }, [loading, seeded, settings.name, settings.place, settings.deadline, settings.timezone]);

  function sync(field: "name" | "place" | "deadline", value: string) {
    setEdited(true);
    if (field === "name") setName(value);
    if (field === "place") setPlace(value);
    if (field === "deadline") setDeadline(value);
  }

  async function handleSave() {
    setSaving(true);
    // Append the selected timezone offset to the deadline so the server
    // (running in UTC on Vercel) interprets it correctly.
    let offsetStr: string;
    if (tz === "auto") {
      const tzOffset = -new Date().getTimezoneOffset();
      offsetStr = `${tzOffset >= 0 ? "+" : ""}${String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0")}:${String(Math.abs(tzOffset) % 60).padStart(2, "0")}`;
    } else {
      offsetStr = tz;
    }
    const deadlineWithTz = deadline ? deadline + ":00" + offsetStr : deadline;
    const res = await saveSettings({ name, place, deadline: deadlineWithTz, timezone: tz });
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
        <CardTitle className="text-lg font-semibold">Configuration</CardTitle>
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
          <div className="flex gap-2">
            <Input
              id="arrivalDeadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => sync("deadline", e.target.value)}
              className="[color-scheme:dark] flex-1"
            />
            <Select value={tz} onValueChange={(v) => { setTz(v ?? "+05:30"); setEdited(true); }}>
              <SelectTrigger className="w-[160px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.offset} value={t.offset}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
