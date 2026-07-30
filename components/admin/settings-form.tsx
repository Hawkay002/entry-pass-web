// components/admin/settings-form.tsx — event name/place/deadline form.

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import { saveSettings } from "@/app/actions/admin";

export function SettingsForm() {
  const { settings, loading } = useSettings();
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

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
    const res = await saveSettings({ name, place, deadline });
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

        <div className="rounded-xl bg-black/30 p-4">
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
        </div>
      </CardContent>
    </Card>
  );
}
