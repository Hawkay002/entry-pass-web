// app/(app)/tickets/page.tsx — Issue Ticket: form + live ticket preview.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketCard } from "@/components/tickets/ticket-card";
import { useSettings } from "@/hooks/use-settings";
import { createTicket } from "@/app/actions/tickets";
import type { Gender, Ticket, TicketType } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  age: z
    .string()
    .min(1, "Enter a valid age")
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 120, {
      message: "Enter a valid age (1–120)",
    }),
  phone: z
    .string()
    .min(10, "Enter 10 digits")
    .regex(/^\d{10}$/, "Must be exactly 10 digits"),
  ticketType: z.enum(["Classic", "Diamond", "Gold"]),
});
type FormValues = z.infer<typeof schema>;

export default function TicketsPage() {
  const { settings } = useSettings();
  const [preview, setPreview] = useState<
    Pick<Ticket, "id" | "name" | "age" | "gender" | "phone" | "ticketType">
  >({
    id: "—",
    name: "",
    age: 0,
    gender: "Male",
    phone: "",
    ticketType: "Classic",
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      gender: "Male",
      age: "",
      phone: "",
      ticketType: "Classic",
    },
  });

  // Live-preview values tracked in local state (controlled by onChange),
  // seeded from the last submitted ticket. Avoids watch() which the React
  // Hooks lint rule flags as incompatible with memoization.
  const [pv, setPv] = useState({ name: "", age: "", phone: "" });
  const [pvGender, setPvGender] = useState<Gender>("Male");
  const [pvType, setPvType] = useState<TicketType>("Classic");
  const livePreview = {
    id: preview.id === "—" ? "preview" : preview.id,
    name: pv.name || preview.name,
    age: Number(pv.age || preview.age) || 0,
    gender: pvGender,
    phone: pv.phone ? "+91" + pv.phone : preview.phone,
    ticketType: pvType,
  };

  async function onSubmit(values: FormValues) {
    const res = await createTicket({
      name: values.name,
      gender: values.gender,
      age: Number(values.age),
      phone: values.phone,
      ticketType: values.ticketType,
    });
    if (res.ok) {
      setPreview({
        id: res.id,
        name: values.name,
        age: Number(values.age),
        gender: values.gender,
        phone: "+91" + values.phone,
        ticketType: values.ticketType,
      });
      toast.success("Pass generated", { description: values.name });
      reset();
      setValue("gender", "Male");
      setValue("ticketType", "Classic");
      setPv({ name: "", age: "", phone: "" });
      setPvGender("Male");
      setPvType("Classic");
    } else {
      toast.error("Could not issue pass", { description: res.error });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>New Guest Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...register("name")}
                onChange={(e) => setPv((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full Name"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ticket Type</Label>
              <Select
                defaultValue="Classic"
                onValueChange={(v) => {
                  const t = v as TicketType;
                  setValue("ticketType", t);
                  setPvType(t);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Classic">Classic</SelectItem>
                  <SelectItem value="Diamond">VIP</SelectItem>
                  <SelectItem value="Gold">VVIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label>Gender</Label>
                <Select
                  defaultValue="Male"
                  onValueChange={(v) => {
                    const g = v as Gender;
                    setValue("gender", g);
                    setPvGender(g);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={1}
                  {...register("age")}
                  onChange={(e) => setPv((p) => ({ ...p, age: e.target.value }))}
                  placeholder="Age"
                />
                {errors.age && (
                  <p className="text-xs text-destructive">{errors.age.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (10 Digits)</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                {...register("phone")}
                onChange={(e) => setPv((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone (10 Digits)"
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Pass
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <TicketCard ticket={livePreview} eventName={settings.name || undefined} />
      </div>
    </div>
  );
}
