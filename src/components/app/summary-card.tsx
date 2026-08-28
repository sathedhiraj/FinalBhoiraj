"use client";

import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatRupee } from "@/lib/format";

export function SummaryCard({
  label,
  amount,
  variant,
}: {
  label: string;
  amount: number;
  variant: "income" | "expense" | "balance";
}) {
  const tone =
    variant === "income"
      ? "text-income bg-income-soft"
      : variant === "expense"
        ? "text-expense bg-expense-soft"
        : "text-primary bg-accent";
  const Icon = variant === "income" ? ArrowDownLeft : variant === "expense" ? ArrowUpRight : Wallet;

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={cn("grid place-items-center h-9 w-9 rounded-xl", tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-xl font-bold tracking-tight",
          variant === "income" ? "text-income" : variant === "expense" ? "text-expense" : "text-foreground",
        )}
      >
        {formatRupee(amount)}
      </p>
    </div>
  );
}
