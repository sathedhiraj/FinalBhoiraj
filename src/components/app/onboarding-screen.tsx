"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Calendar, Hash, Phone, Building2 } from "lucide-react";

const YEAR = new Date().getFullYear();

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    address: "",
    establishedYear: String(YEAR),
    registrationNumber: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Mandal name is required.");
    if (!form.address.trim()) return toast.error("Address is required.");
    const year = Number(form.establishedYear);
    if (!Number.isInteger(year) || year < 1900 || year > YEAR + 1)
      return toast.error("Enter a valid established year.");
    if (!form.registrationNumber.trim()) return toast.error("Registration number is required.");
    if (form.phone.replace(/\D/g, "").length < 6) return toast.error("Enter a valid WhatsApp/Mobile number.");

    setLoading(true);
    try {
      const res = await fetch("/api/mandal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, establishedYear: year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create Mandal.");
      toast.success("Mandal created! Welcome aboard.");
      await qc.invalidateQueries({ queryKey: ["me"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create Mandal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="bg-festive px-6 pt-14 pb-20 rounded-b-[2.25rem] text-center">
        <div className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-white/15 ring-1 ring-white/30 text-4xl mb-3">
          🪔
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Create Your Mandal</h1>
        <p className="text-sm text-white/85 mt-1">Let&apos;s set up your Mandal profile to get started.</p>
      </div>

      <div className="flex-1 px-5 -mt-10 pb-10">
        <form onSubmit={submit} className="bg-card rounded-3xl shadow-xl ring-1 ring-border p-6 space-y-4">
          <Field id="m-name" label="Mandal Name" icon={<Building2 className="h-4 w-4" />}>
            <Input
              id="m-name"
              className="h-12 rounded-xl pl-9"
              placeholder="e.g. Bhairaj Navayuvak Ganesh Mandal"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <Field id="m-address" label="Address" icon={<MapPin className="h-4 w-4" />}>
            <Input
              id="m-address"
              className="h-12 rounded-xl pl-9"
              placeholder="Area, City, State"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="m-year" label="Established Year" icon={<Calendar className="h-4 w-4" />}>
              <Input
                id="m-year"
                type="number"
                inputMode="numeric"
                className="h-12 rounded-xl pl-9"
                value={form.establishedYear}
                onChange={(e) => set("establishedYear", e.target.value)}
              />
            </Field>
            <Field id="m-reg" label="Registration No." icon={<Hash className="h-4 w-4" />}>
              <Input
                id="m-reg"
                className="h-12 rounded-xl pl-9"
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
                placeholder="REG-2026"
              />
            </Field>
          </div>

          <Field id="m-phone" label="WhatsApp / Mobile Number" icon={<Phone className="h-4 w-4" />}>
            <Input
              id="m-phone"
              type="tel"
              inputMode="tel"
              className="h-12 rounded-xl pl-9"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="98765 43210"
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Mandal"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-5">
          A default festival “Ganesh Utsav {YEAR}” will be created automatically.
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  );
}
