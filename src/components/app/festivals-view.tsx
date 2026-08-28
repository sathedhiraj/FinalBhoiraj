"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type MeResponse, type Transaction } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatRupee, festivalLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Plus, Check, Sparkles, BadgeCheck, Lock, Unlock, ArrowDownLeft, ArrowUpRight, Wallet, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";

const YEAR = new Date().getFullYear();

export function FestivalsView({ me, onUpdated }: { me: MeResponse; onUpdated: () => void }) {
  const qc = useQueryClient();
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(YEAR));
  const [activate, setActivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data } = useQuery({
    queryKey: ["all-transactions", me.mandal!.id, useAppStore.getState().refreshKey],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/api/transactions`),
  });
  const txs = data?.transactions ?? [];
  const byFestival = (id: string) => txs.filter((t) => t.festivalId === id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Festival name is required.");
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1900 || y > 2100) return toast.error("Enter a valid year.");
    setCreating(true);
    try {
      const res = await api.post<{ festival: { id: string } }>("/api/festivals", { name: name.trim(), year: y, activate });
      toast.success(activate ? "Festival created & activated." : "Festival created.");
      setOpen(false);
      setName("");
      setActivate(false);
      await qc.invalidateQueries({ queryKey: ["me"] });
      if (activate) store.setActiveFestivalId(res.festival.id);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create festival.");
    } finally {
      setCreating(false);
    }
  }

  async function activateFestival(id: string) {
    try {
      await api.patch(`/api/festivals/${id}`, { activate: true });
      await qc.invalidateQueries({ queryKey: ["me"] });
      store.setActiveFestivalId(id);
      toast.success("Festival activated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    }
  }

  async function toggleStatus(id: string, status: string) {
    const next = status === "active" ? "closed" : "active";
    try {
      await api.patch(`/api/festivals/${id}`, { status: next });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`Festival ${next}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Festivals / Utsav</h2>
          <p className="text-xs text-muted-foreground">Each festival keeps its own income, expenses &amp; balance.</p>
        </div>
        <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <div className="space-y-3">
        {me.festivals.map((f) => {
          const list = byFestival(f.id);
          const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
          const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
          const balance = income - expense;
          const isActive = f.id === me.activeFestival?.id;
          return (
            <div key={f.id} className={cn("rounded-2xl ring-1 p-4", isActive ? "ring-primary bg-accent/40" : "ring-border bg-card")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-semibold truncate">{festivalLabel(f.name, f.year)}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge>{f.status}</Badge>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" /> Active
                      </span>
                    )}
                  </div>
                </div>
                {!isActive && (
                  <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => activateFestival(f.id)}>
                    Activate
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <MiniStat label="Income" value={formatRupee(income)} tone="income" icon={<ArrowDownLeft className="h-3 w-3" />} />
                <MiniStat label="Expense" value={formatRupee(expense)} tone="expense" icon={<ArrowUpRight className="h-3 w-3" />} />
                <MiniStat label="Balance" value={formatRupee(balance)} tone="primary" icon={<Wallet className="h-3 w-3" />} />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => toggleStatus(f.id, f.status)}
                >
                  {f.status === "active" ? (
                    <><Lock className="h-3.5 w-3.5 mr-1" /> Close Festival</>
                  ) : (
                    <><Unlock className="h-3.5 w-3.5 mr-1" /> Reopen</>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">{list.length} transactions</span>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Create Festival</DialogTitle>
            <DialogDescription>Create a new festival with its own income, expenses and balance.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-name">Festival Name</Label>
              <Input id="f-name" className="h-11 rounded-xl" placeholder="e.g. Navratri 2026" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-year">Year</Label>
              <Input id="f-year" type="number" className="h-11 rounded-xl" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} className="h-4 w-4 accent-primary" />
              Activate this festival immediately
            </label>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={creating} className="rounded-xl">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-muted text-muted-foreground">
      {children}
    </span>
  );
}

function MiniStat({
  label, value, tone, icon,
}: { label: string; value: string; tone: "income" | "expense" | "primary"; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background/60 ring-1 ring-border p-2">
      <div className={cn("flex items-center gap-1 text-[10px] font-medium", tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-primary")}>
        {icon} {label}
      </div>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}
