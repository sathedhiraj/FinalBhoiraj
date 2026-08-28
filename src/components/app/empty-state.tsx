"use client";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className={cn("mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-accent text-accent-foreground mb-3")}>
        {icon ?? <span className="text-2xl">📭</span>}
      </div>
      <p className="font-semibold">{title}</p>
      {message && <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{message}</p>}
    </div>
  );
}
