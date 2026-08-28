"use client";

import { create } from "zustand";
import type { Mandal, Festival, MeResponse } from "@/lib/api";

type FlowKind = "income" | "expense" | null;

type AppState = {
  // Hydration / boot status
  bootStatus: "loading" | "auth" | "onboarding" | "ready";
  setBootStatus: (s: AppState["bootStatus"]) => void;

  me: MeResponse | null;
  setMe: (me: MeResponse | null) => void;

  // Active view in the bottom-nav app shell
  view: "dashboard" | "entries" | "reports" | "festivals" | "settings";
  setView: (v: AppState["view"]) => void;

  // Active overlay flow (income/expense) — null when no flow open
  flow: FlowKind;
  setFlow: (f: FlowKind) => void;

  // The currently active festival (mirrors backend, switchable)
  activeFestivalId: string | null;
  setActiveFestivalId: (id: string) => void;

  // Refresh token — bump to trigger refetches across views after a mutation
  refreshKey: number;
  bumpRefresh: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  bootStatus: "loading",
  setBootStatus: (bootStatus) => set({ bootStatus }),

  me: null,
  setMe: (me) => set({ me, activeFestivalId: me?.activeFestival?.id ?? null }),

  view: "dashboard",
  setView: (view) => set({ view }),

  flow: null,
  setFlow: (flow) => set({ flow }),

  activeFestivalId: null,
  setActiveFestivalId: (activeFestivalId) => set({ activeFestivalId }),

  refreshKey: 0,
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));

export type { Mandal, Festival };
