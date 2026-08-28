"use client";

import { cn } from "@/lib/utils";
import { formatRupee, formatDateShort } from "@/lib/format";
import { INCOME_CATEGORY_ICONS, EXPENSE_CATEGORY_ICONS, PAYMENT_MODE_ICONS } from "@/lib/constants";
import type { Transaction } from "@/lib/api";

export function TransactionCard({ tx, onClick }: { tx: Transaction; onClick?: (tx: Transaction) => void }) {
  const isIncome = tx.type === "income";
  const icon = isIncome
    ? INCOME_CATEGORY_ICONS[tx.category] ?? "🪙"
    : EXPENSE_CATEGORY_ICONS[tx.category] ?? "🧾";
  const name = isIncome ? tx.donorName || "Donor" : tx.vendorName || "Vendor";

  return (
    <button
      type="button"
      onClick={() => onClick?.(tx)}
      className="w-full text-left bg-card rounded-2xl ring-1 ring-border p-3 flex items-center gap-3 hover:ring-primary/40 transition shadow-sm"
    >
      <span
        className={cn(
          "relative grid place-items-center h-11 w-11 rounded-xl text-xl shrink-0",
          isIncome ? "bg-income-soft" : "bg-expense-soft",
        )}
      >
        {icon}
        <span
          className={cn(
            "absolute -left-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-card",
            isIncome ? "bg-income" : "bg-expense",
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold truncate">{tx.category}</p>
          <p className={cn("font-bold whitespace-nowrap", isIncome ? "text-income" : "text-expense")}>
            {isIncome ? "+" : "−"}
            {formatRupee(tx.amount)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {name} · {PAYMENT_MODE_ICONS[tx.paymentMode]} {tx.paymentMode}
          </p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(tx.date)}</p>
        </div>
        {tx.receiptNumber && (
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">Receipt: {tx.receiptNumber}</p>
        )}
      </div>
    </button>
  );
}
