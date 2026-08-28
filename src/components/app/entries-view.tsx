"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type MeResponse, type Transaction } from "@/lib/api";
import { TransactionCard } from "@/components/app/transaction-card";
import { EmptyState } from "@/components/app/empty-state";
import { useAppStore } from "@/store/app-store";
import { formatRupee } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Search, X, ArrowDownLeft, ArrowUpRight, Receipt, Filter, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toDateInputValue } from "@/lib/format";

type Chip = "all" | "income" | "expense" | "cash" | "upi";

export function EntriesView({ me }: { me: MeResponse }) {
  const festivalId = me.activeFestival?.id ?? me.festivals[0]?.id ?? "";
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [chip, setChip] = useState<Chip>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams({ festivalId });
  if (chip === "income" || chip === "expense") params.set("type", chip);
  if (chip === "cash" || chip === "upi") params.set("paymentMode", chip);
  if (q.trim()) params.set("q", q.trim());
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const listQuery = useQuery({
    queryKey: ["entries", festivalId, chip, q, from, to, refreshKey],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/api/transactions?${params.toString()}`),
    enabled: !!festivalId,
  });

  // Summary uses unfiltered list for the festival.
  const summaryQuery = useQuery({
    queryKey: ["entries-summary", festivalId, refreshKey],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/api/transactions?festivalId=${festivalId}`),
    enabled: !!festivalId,
  });

  const all = summaryQuery.data?.transactions ?? [];
  const incomeCount = all.filter((t) => t.type === "income").length;
  const expenseCount = all.filter((t) => t.type === "expense").length;
  const totalIncome = all.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = all.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const list = listQuery.data?.transactions ?? [];
  const activeFilters = (chip !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const chips: { key: Chip; label: string }[] = [
    { key: "all", label: "All" },
    { key: "income", label: "Income" },
    { key: "expense", label: "Expense" },
    { key: "cash", label: "Cash" },
    { key: "upi", label: "UPI" },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Summary grid */}
      <section className="grid grid-cols-2 gap-3">
        <SummaryTile label="Total Income" value={formatRupee(totalIncome)} icon={<ArrowDownLeft className="h-4 w-4" />} tone="income" />
        <SummaryTile label="Total Expense" value={formatRupee(totalExpense)} icon={<ArrowUpRight className="h-4 w-4" />} tone="expense" />
        <SummaryTile label="Total Entries" value={String(all.length)} icon={<Receipt className="h-4 w-4" />} tone="neutral" />
        <SummaryTile
          label="Income / Expense"
          value={`${incomeCount} / ${expenseCount}`}
          icon={<Receipt className="h-4 w-4" />}
          tone="neutral"
        />
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, mobile, category, receipt no."
          className="h-11 rounded-xl pl-9 pr-9"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chips + date filter */}
      <div className="flex items-center gap-2 overflow-x-auto app-scroll pb-1 -mx-1 px-1">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setChip(c.key)}
            className={cn(
              "shrink-0 px-3.5 h-8 rounded-full text-xs font-medium transition ring-1",
              chip === c.key ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border",
            )}
          >
            {c.label}
          </button>
        ))}
        <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} active={activeFilters} />
      </div>

      {/* List */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">
            {list.length} {list.length === 1 ? "entry" : "entries"}
          </h2>
          {activeFilters > 0 && (
            <button
              onClick={() => { setChip("all"); setFrom(""); setTo(""); setQ(""); }}
              className="text-xs text-primary font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {listQuery.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-card ring-1 ring-border animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="No transactions found"
            message={activeFilters > 0 ? "Try adjusting your filters or search." : "Add your first transaction to see it here."}
          />
        ) : (
          <div className="space-y-2 max-h-[58vh] overflow-y-auto app-scroll pr-1">
            {list.map((tx) => (
              <TransactionCard key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "income" | "expense" | "neutral";
}) {
  return (
    <div className="bg-card rounded-2xl ring-1 ring-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={cn(tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-muted-foreground")}>{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 font-bold">{value}</p>
    </div>
  );
}

function DateRangeFilter({
  from,
  to,
  setFrom,
  setTo,
  active,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  active: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "shrink-0 px-3.5 h-8 rounded-full text-xs font-medium transition ring-1 flex items-center gap-1.5",
            active > 0 ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border",
          )}
        >
          <Calendar className="h-3.5 w-3.5" /> Date {active > 0 && `(${active})`}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl p-4" align="start">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Filter className="h-4 w-4" /> Date Range
        </p>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} max={to || toDateInputValue(new Date())} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl" />
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} min={from || undefined} max={toDateInputValue(new Date())} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl" onClick={() => { setFrom(""); setTo(""); }}>
            Clear
          </Button>
          <Button size="sm" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
