"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type MeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Loader2, Save, Image as ImageIcon, Hash, Building2, MapPin, Calendar, Phone } from "lucide-react";

const YEAR = new Date().getFullYear();

export function SettingsView({ me, onUpdated }: { me: MeResponse; onUpdated: () => void }) {
  const qc = useQueryClient();
  const mandal = me.mandal!;
  const [m, setM] = useState({
    name: mandal.name,
    address: mandal.address,
    establishedYear: String(mandal.establishedYear),
    registrationNumber: mandal.registrationNumber,
    phone: mandal.phone,
    logoUrl: mandal.logoUrl ?? "",
  });
  const [r, setR] = useState({
    receiptHeader: mandal.receiptHeader,
    receiptFooter: mandal.receiptFooter,
    receiptPrefix: mandal.receiptPrefix,
  });
  const [savingM, setSavingM] = useState(false);
  const [savingR, setSavingR] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setM((s) => ({ ...s, logoUrl: data.url }));
      toast.success("Logo uploaded. Save changes to apply.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function saveMandal(e: React.FormEvent) {
    e.preventDefault();
    if (!m.name.trim()) return toast.error("Mandal name is required.");
    const y = Number(m.establishedYear);
    if (!Number.isInteger(y) || y < 1900 || y > YEAR + 1) return toast.error("Enter a valid established year.");
    setSavingM(true);
    try {
      await api.patch("/api/mandal", {
        name: m.name,
        address: m.address,
        establishedYear: y,
        registrationNumber: m.registrationNumber,
        phone: m.phone,
        logoUrl: m.logoUrl || null,
      });
      toast.success("Mandal details saved.");
      await qc.invalidateQueries({ queryKey: ["me"] });
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingM(false);
    }
  }

  async function saveReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!r.receiptPrefix.trim()) return toast.error("Receipt prefix is required.");
    setSavingR(true);
    try {
      await api.patch("/api/mandal", {
        receiptHeader: r.receiptHeader,
        receiptFooter: r.receiptFooter,
        receiptPrefix: r.receiptPrefix,
      });
      toast.success("Receipt settings saved.");
      await qc.invalidateQueries({ queryKey: ["me"] });
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingR(false);
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h2 className="font-semibold">Settings</h2>
        <p className="text-xs text-muted-foreground">Manage your Mandal profile and receipt configuration.</p>
      </div>

      <Tabs defaultValue="mandal">
        <TabsList className="grid grid-cols-2 w-full rounded-xl">
          <TabsTrigger value="mandal">Mandal Details</TabsTrigger>
          <TabsTrigger value="receipt">Receipt Settings</TabsTrigger>
        </TabsList>

        {/* Mandal details */}
        <TabsContent value="mandal">
          <form onSubmit={saveMandal} className="bg-card rounded-2xl ring-1 ring-border p-5 space-y-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="grid place-items-center h-20 w-20 rounded-2xl bg-muted ring-1 ring-border overflow-hidden">
                {m.logoUrl ? (
                  <img src={m.logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                  {m.logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
                {m.logoUrl && (
                  <button type="button" onClick={() => setM({ ...m, logoUrl: "" })} className="block text-xs text-destructive hover:underline">
                    Remove logo
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
              </div>
            </div>

            <FieldRow icon={<Building2 className="h-4 w-4" />} label="Mandal Name">
              <Input className="h-11 rounded-xl pl-9" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
            </FieldRow>
            <FieldRow icon={<MapPin className="h-4 w-4" />} label="Address">
              <Input className="h-11 rounded-xl pl-9" value={m.address} onChange={(e) => setM({ ...m, address: e.target.value })} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow icon={<Calendar className="h-4 w-4" />} label="Established Year">
                <Input type="number" className="h-11 rounded-xl pl-9" value={m.establishedYear} onChange={(e) => setM({ ...m, establishedYear: e.target.value })} />
              </FieldRow>
              <FieldRow icon={<Hash className="h-4 w-4" />} label="Registration No.">
                <Input className="h-11 rounded-xl pl-9" value={m.registrationNumber} onChange={(e) => setM({ ...m, registrationNumber: e.target.value })} />
              </FieldRow>
            </div>
            <FieldRow icon={<Phone className="h-4 w-4" />} label="WhatsApp / Mobile">
              <Input className="h-11 rounded-xl pl-9" value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value })} />
            </FieldRow>

            <Button type="submit" disabled={savingM} className="w-full h-12 rounded-xl font-semibold">
              {savingM ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </form>
        </TabsContent>

        {/* Receipt settings */}
        <TabsContent value="receipt">
          <form onSubmit={saveReceipt} className="bg-card rounded-2xl ring-1 ring-border p-5 space-y-4">
            <FieldRow label="Receipt Header">
              <Input className="h-11 rounded-xl" value={r.receiptHeader} onChange={(e) => setR({ ...r, receiptHeader: e.target.value })} placeholder="Shree Ganesh" />
            </FieldRow>
            <FieldRow label="Mandal Name (on receipt)">
              <Input className="h-11 rounded-xl" value={m.name} disabled />
              <p className="text-[11px] text-muted-foreground mt-1">Edit in Mandal Details tab.</p>
            </FieldRow>
            <FieldRow label="Footer Message">
              <Input className="h-11 rounded-xl" value={r.receiptFooter} onChange={(e) => setR({ ...r, receiptFooter: e.target.value })} placeholder="Ganpati Bappa Morya!" />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Receipt Prefix">
                <Input className="h-11 rounded-xl" value={r.receiptPrefix} onChange={(e) => setR({ ...r, receiptPrefix: e.target.value })} placeholder="GM-" />
              </FieldRow>
              <FieldRow label="Next Receipt No.">
                <Input className="h-11 rounded-xl" value={mandal.receiptNextNumber} disabled />
                <p className="text-[11px] text-muted-foreground mt-1">Auto-increments on each income.</p>
              </FieldRow>
            </div>
            <div className="rounded-xl bg-accent/50 p-3 text-xs text-accent-foreground">
              Preview: <span className="font-semibold">{r.receiptPrefix}{String(mandal.receiptNextNumber).padStart(4, "0")}</span>
            </div>
            <Button type="submit" disabled={savingR} className="w-full h-12 rounded-xl font-semibold">
              {savingR ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Receipt Settings
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="text-center text-xs text-muted-foreground pt-1">
        Logged in as {me.user.email} · Ganpati Bappa Morya!
      </div>
    </div>
  );
}

function FieldRow({
  icon, label, children,
}: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {icon ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
