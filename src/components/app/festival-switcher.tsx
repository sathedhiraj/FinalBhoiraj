"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import type { MeResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { festivalLabel } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export function FestivalSwitcher({ me }: { me?: MeResponse }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const store = useAppStore();
  const active = me?.activeFestival;
  const festivals = me?.festivals ?? [];

  async function activate(id: string) {
    setOpen(false);
    if (id === active?.id) return;
    try {
      await apiPatch(`/api/festivals/${id}`, { activate: true });
      await qc.invalidateQueries({ queryKey: ["me"] });
      store.setActiveFestivalId(id);
      toast.success("Festival switched.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to switch festival.");
    }
  }

  return (
    <div className="mt-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 bg-white/15 ring-1 ring-white/25 rounded-xl px-3 py-2 text-white text-left hover:bg-white/25 transition">
            <span className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-widest text-white/70 leading-none">Active Festival</span>
                <span className="block text-sm font-semibold truncate">{active ? festivalLabel(active.name, active.year) : "No festival"}</span>
              </span>
            </span>
            <ChevronDown className="h-4 w-4 opacity-80" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[22rem] max-w-[90vw] rounded-2xl p-1" align="start">
          <p className="px-3 py-2 text-xs text-muted-foreground">Switch active festival</p>
          <div className="max-h-72 overflow-y-auto app-scroll">
            {festivals.map((f) => (
              <button
                key={f.id}
                onClick={() => activate(f.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-accent transition",
                  f.id === active?.id && "bg-accent/60",
                )}
              >
                <span>
                  <span className="block text-sm font-medium">{festivalLabel(f.name, f.year)}</span>
                  <span className="text-xs text-muted-foreground capitalize">{f.status}</span>
                </span>
                {f.id === active?.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false) || useAppStore.getState().setView("festivals")}
            className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-accent border-t border-border"
          >
            <Sparkles className="h-4 w-4" /> Manage Festivals
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

async function apiPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.error || "Request failed");
  }
  return res.json();
}
