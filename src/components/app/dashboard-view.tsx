"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { api, type MeResponse, type Transaction } from "@/lib/api";
import { SummaryCard } from "@/components/app/summary-card";
import { TransactionCard } from "@/components/app/transaction-card";
import { useAppStore } from "@/store/app-store";
import { formatRupee } from "@/lib/format";
import { Wallet, TrendingUp, TrendingDown, ChevronRight, ReceiptText, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/app/empty-state";

export function DashboardView({ me }: { me: MeResponse }) {
  const festivalId = me.activeFestival?.id ?? me.festivals[0]?.id ?? "";
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", festivalId, refreshKey],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/api/transactions?festivalId=${festivalId}`),
    enabled: !!festivalId,
  });

  const txs = data?.transactions ?? [];
  const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const recent = txs.slice(0, 6);
  const store = useAppStore();

  async function downloadPdf() {
    if (!festivalId) return toast.error("No active festival.");
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/report-pdf?festivalId=${festivalId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to generate PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] || `mandal-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success("PDF report downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-5 pb-2">
      {/* Balance hero */}
      <section className="bg-card rounded-3xl ring-1 ring-border shadow-sm p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span className="text-xs font-medium">Current In-Hand Balance</span>
        </div>
        <p className={cn("text-3xl font-bold mt-1 tracking-tight", balance >= 0 ? "text-foreground" : "text-expense")}>
          {formatRupee(balance)}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-income">
            <TrendingUp className="h-3.5 w-3.5" /> Income {formatRupee(totalIncome)}
          </span>
          <span className="flex items-center gap-1 text-expense">
            <TrendingDown className="h-3.5 w-3.5" /> Spent {formatRupee(totalExpense)}
          </span>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-3 gap-3">
        <SummaryCard label="Collected" amount={totalIncome} variant="income" />
        <SummaryCard label="Spent" amount={totalExpense} variant="expense" />
        <SummaryCard label="Balance" amount={balance} variant="balance" />
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3">
        <Stat label="Total Entries" value={String(txs.length)} icon={<ReceiptText className="h-4 w-4" />} />
        <Stat
          label="Festival"
          value={me.activeFestival ? `${me.activeFestival.name}` : "—"}
          icon={<Wallet className="h-4 w-4" />}
        />
      </section>

      {/* Download PDF report */}
      <section>
        <button
          onClick={downloadPdf}
          disabled={pdfLoading || txs.length === 0}
          className={cn(
            "w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition shadow-sm",
            "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99]",
            (pdfLoading || txs.length === 0) && "opacity-60 cursor-not-allowed",
          )}
        >
          {pdfLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {pdfLoading ? "Generating PDF…" : "Download PDF Report"}
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          Includes current balance, all income &amp; expense records with names.
        </p>
      </section>

      {/* Recent entries */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Recent Entries</h2>
          {txs.length > 0 && (
            <button
              onClick={() => store.setView("entries")}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-card ring-1 ring-border animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="No entries yet"
            message="Tap the + button to record your first income or expense for this festival."
          />
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <TransactionCard key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl ring-1 ring-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 font-semibold truncate">{value}</p>
    </div>
  );
}
