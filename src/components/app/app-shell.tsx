"use client";

import { useQuery } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { api, type MeResponse } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { Splash } from "@/components/app/splash";
import { OnboardingScreen } from "@/components/app/onboarding-screen";
import { DashboardView } from "@/components/app/dashboard-view";
import { EntriesView } from "@/components/app/entries-view";
import { ReportsView } from "@/components/app/reports-view";
import { FestivalsView } from "@/components/app/festivals-view";
import { SettingsView } from "@/components/app/settings-view";
import { IncomeFlow } from "@/components/app/income-flow";
import { ExpenseFlow } from "@/components/app/expense-flow";
import { FestivalSwitcher } from "@/components/app/festival-switcher";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ListPlus, PieChart, SlidersHorizontal, Plus, LogOut, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "entries", label: "Entries", Icon: ListPlus },
  { key: "add", label: "Add", Icon: Plus },
  { key: "reports", label: "Reports", Icon: PieChart },
  { key: "settings", label: "Settings", Icon: SlidersHorizontal },
] as const;

export function AppShell() {
  const { data: me, isLoading, refetch } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/me"),
  });
  const store = useAppStore();
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading || !me) return <Splash />;

  if (!me.mandal) {
    return <OnboardingScreen onDone={() => refetch()} />;
  }

  const view = store.view;
  const flow = store.flow;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto relative">
      {/* Top brand bar with festival switcher + logout */}
      <header className="bg-festive px-4 pt-4 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">🙏</span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-white/80 leading-none">Shree Ganesh</p>
              <h1 className="text-lg font-bold truncate max-w-[60vw]">{me.mandal.name}</h1>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirect: false })}
            className="grid place-items-center h-9 w-9 rounded-full bg-white/15 ring-1 ring-white/25 text-white hover:bg-white/25 transition"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <FestivalSwitcher me={me} />
      </header>

      {/* Main content */}
      <main className="flex-1 app-scroll overflow-y-auto px-4 pt-4 pb-28">
        {view === "dashboard" && <DashboardView me={me} />}
        {view === "entries" && <EntriesView me={me} />}
        {view === "reports" && <ReportsView me={me} />}
        {view === "festivals" && <FestivalsView me={me} onUpdated={() => refetch()} />}
        {view === "settings" && <SettingsView me={me} onUpdated={() => refetch()} />}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-30 mt-auto">
        <div className="max-w-md mx-auto px-4 pb-3 pt-1">
          <div className="bg-card/95 backdrop-blur ring-1 ring-border rounded-2xl shadow-lg grid grid-cols-5 items-center h-16">
            {NAV.map((item) => {
              if (item.key === "add") {
                return (
                  <button
                    key="add"
                    onClick={() => setAddOpen(true)}
                    className="relative -mt-8 grid place-items-center mx-auto h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background active:scale-95 transition"
                    aria-label="Add transaction"
                  >
                    <Plus className="h-7 w-7" />
                  </button>
                );
              }
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => store.setView(item.key as typeof view)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 h-full transition",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add menu */}
        {addOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center"
            onClick={() => setAddOpen(false)}
          >
            <div
              className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl ring-1 ring-border animate-in fade-in slide-in-from-bottom-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-border mb-4 sm:hidden" />
              <h2 className="text-base font-semibold mb-3 px-1">Add Transaction</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setAddOpen(false);
                    store.setFlow("income");
                  }}
                  className="rounded-2xl bg-income-soft text-income p-4 text-left active:scale-[0.98] transition"
                >
                  <ArrowDownLeft className="h-7 w-7 mb-2" />
                  <p className="font-semibold">Add Income</p>
                  <p className="text-xs text-income/80">Vargani, Donation…</p>
                </button>
                <button
                  onClick={() => {
                    setAddOpen(false);
                    store.setFlow("expense");
                  }}
                  className="rounded-2xl bg-expense-soft text-expense p-4 text-left active:scale-[0.98] transition"
                >
                  <ArrowUpRight className="h-7 w-7 mb-2" />
                  <p className="font-semibold">Add Expense</p>
                  <p className="text-xs text-expense/80">Mandap, Decoration…</p>
                </button>
              </div>
              <Button variant="ghost" className="w-full mt-3 rounded-xl" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Full-screen income/expense flow overlays */}
      {flow === "income" && <IncomeFlow me={me} onDone={() => refetch()} />}
      {flow === "expense" && <ExpenseFlow me={me} onDone={() => refetch()} />}
    </div>
  );
}
