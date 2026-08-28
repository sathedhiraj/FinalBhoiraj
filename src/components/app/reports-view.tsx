"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type MeResponse } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { formatRupee, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend,
} from "recharts";

const COLORS = ["#f59e0b", "#22c55e", "#ef4444", "#14b8a6", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#84cc16"];

type ReportData = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalTransactions: number;
  incomeByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
  cashVsUpi: { cashIncome: number; upiIncome: number; cashExpense: number; upiExpense: number };
  daily: { date: string; amount: number }[];
  dailyExpense: { date: string; amount: number }[];
  monthly: { month: string; amount: number }[];
  monthlyExpense: { month: string; amount: number }[];
};

export function ReportsView({ me }: { me: MeResponse }) {
  const festivalId = me.activeFestival?.id ?? me.festivals[0]?.id ?? "";
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [type, setType] = useState<"" | "income" | "expense">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams({ festivalId });
  if (type) params.set("type", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", festivalId, type, from, to, refreshKey],
    queryFn: () => api.get<ReportData>(`/api/reports?${params.toString()}`),
    enabled: !!festivalId,
  });

  const d = data;
  const cashVsUpiData = d
    ? [
        { name: "Cash Income", value: d.cashVsUpi.cashIncome },
        { name: "UPI Income", value: d.cashVsUpi.upiIncome },
        { name: "Cash Expense", value: d.cashVsUpi.cashExpense },
        { name: "UPI Expense", value: d.cashVsUpi.upiExpense },
      ].filter((x) => x.value > 0)
    : [];

  const typeChips: { key: "" | "income" | "expense"; label: string }[] = [
    { key: "", label: "All" },
    { key: "income", label: "Income" },
    { key: "expense", label: "Expense" },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto app-scroll pb-1 -mx-1 px-1">
        {typeChips.map((c) => (
          <button
            key={c.key}
            onClick={() => setType(c.key)}
            className={cn(
              "shrink-0 px-3.5 h-8 rounded-full text-xs font-medium transition ring-1",
              type === c.key ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border",
            )}
          >
            {c.label}
          </button>
        ))}
        <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} active={(from ? 1 : 0) + (to ? 1 : 0)} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <BigCard label="Total Income" value={formatRupee(d?.totalIncome ?? 0)} icon={<TrendingUp className="h-4 w-4" />} tone="income" />
        <BigCard label="Total Expense" value={formatRupee(d?.totalExpense ?? 0)} icon={<TrendingDown className="h-4 w-4" />} tone="expense" />
        <BigCard label="Current Balance" value={formatRupee(d?.balance ?? 0)} icon={<Wallet className="h-4 w-4" />} tone="primary" />
        <BigCard label="Transactions" value={String(d?.totalTransactions ?? 0)} icon={<Receipt className="h-4 w-4" />} tone="neutral" />
      </div>

      {isLoading ? (
        <div className="h-40 rounded-2xl bg-card ring-1 ring-border animate-pulse" />
      ) : !d || d.totalTransactions === 0 ? (
        <EmptyState title="No data for filters" message="Record some transactions to see analytics here." />
      ) : (
        <>
          {/* Income by category */}
          {(!type || type === "income") && d.totalIncome > 0 && (
            <ChartCard title="Income by Category">
              <CategoryBars data={d.incomeByCategory} tone="income" />
            </ChartCard>
          )}

          {/* Expense by category */}
          {(!type || type === "expense") && d.totalExpense > 0 && (
            <ChartCard title="Expense by Category">
              <CategoryBars data={d.expenseByCategory} tone="expense" />
            </ChartCard>
          )}

          {/* Cash vs UPI */}
          {cashVsUpiData.length > 0 && (
            <ChartCard title="Cash vs UPI">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cashVsUpiData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {cashVsUpiData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatRupee(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* Daily collection */}
          {d.daily.length > 0 && (
            <ChartCard title="Daily Collection">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.daily} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} width={36} />
                    <Tooltip formatter={(v: number) => formatRupee(v)} />
                    <Area type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} fill="url(#gIncome)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* Monthly collection + expense */}
          {(d.monthly.length > 0 || d.monthlyExpense.length > 0) && (
            <ChartCard title="Monthly Collection vs Expenses">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mergeMonths(d.monthly, d.monthlyExpense)}
                    margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} width={36} />
                    <Tooltip formatter={(v: number) => formatRupee(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

function mergeMonths(
  monthly: { month: string; amount: number }[],
  monthlyExpense: { month: string; amount: number }[],
) {
  const map = new Map<string, { month: string; income: number; expense: number }>();
  for (const m of monthly) map.set(m.month, { month: m.month, income: m.amount, expense: 0 });
  for (const m of monthlyExpense) {
    const existing = map.get(m.month) ?? { month: m.month, income: 0, expense: 0 };
    existing.expense = m.amount;
    map.set(m.month, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function BigCard({
  label, value, icon, tone,
}: { label: string; value: string; icon: React.ReactNode; tone: "income" | "expense" | "primary" | "neutral" }) {
  const toneClass =
    tone === "income" ? "text-income bg-income-soft" :
    tone === "expense" ? "text-expense bg-expense-soft" :
    tone === "primary" ? "text-primary bg-accent" : "text-muted-foreground bg-muted";
  return (
    <div className="bg-card rounded-2xl ring-1 ring-border p-4">
      <div className="flex items-center gap-2">
        <span className={cn("grid place-items-center h-8 w-8 rounded-lg", toneClass)}>{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={cn("mt-2 text-lg font-bold", tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : tone === "primary" ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl ring-1 ring-border p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function CategoryBars({ data, tone }: { data: { category: string; amount: number }[]; tone: "income" | "expense" }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const color = tone === "income" ? "bg-income" : "bg-expense";
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.category}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">{d.category}</span>
            <span className="text-muted-foreground">{formatRupee(d.amount)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full", color)} style={{ width: `${(d.amount / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DateRangeFilter({
  from, to, setFrom, setTo, active,
}: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; active: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("shrink-0 px-3.5 h-8 rounded-full text-xs font-medium transition ring-1 flex items-center gap-1.5", active > 0 ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border")}>
          <Calendar className="h-3.5 w-3.5" /> Date {active > 0 && `(${active})`}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl p-4" align="start">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Filter className="h-4 w-4" /> Date Range</p>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} max={to || toDateInputValue(new Date())} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl" />
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} min={from || undefined} max={toDateInputValue(new Date())} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>
          <Button size="sm" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
