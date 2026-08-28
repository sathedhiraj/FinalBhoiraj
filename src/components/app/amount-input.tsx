"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A premium rupee amount input with a ₹ prefix and large numeric display. */
export const AmountInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; id?: string }
>(function AmountInput({ value, onChange, placeholder, className, id }, ref) {
  return (
    <div className={cn("relative", className)}>
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">₹</span>
      <Input
        id={id}
        ref={ref}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        placeholder={placeholder ?? "0"}
        onChange={(e) => onChange(e.target.value)}
        className="h-16 rounded-2xl pl-11 pr-4 text-2xl font-semibold"
      />
    </div>
  );
});
