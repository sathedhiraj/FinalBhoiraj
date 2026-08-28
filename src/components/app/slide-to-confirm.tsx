"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader2, Check } from "lucide-react";

type Variant = "income" | "expense" | "default";

const KNOB = 48; // knob width (h-12 w-12)

/**
 * Slide-to-confirm widget. User drags the knob to the right edge to trigger
 * onConfirm. Shows a loading state while the async confirm is running.
 */
export function SlideToConfirm({
  label,
  confirmLabel = "Saving…",
  doneLabel = "Saved",
  onConfirm,
  disabled,
  variant = "default",
}: {
  label: string;
  confirmLabel?: string;
  doneLabel?: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  variant?: Variant;
}) {
  const [max, setMax] = useState(0);
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [startX, setStartX] = useState(0);

  useEffect(() => {
    function measure() {
      const el = document.getElementById("slide-track");
      if (el) setMax(el.clientWidth - KNOB - 8);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || state !== "idle") return;
    setDragging(true);
    setStartX(e.clientX - pos);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const raw = e.clientX - startX;
    setPos(Math.max(0, Math.min(raw, max)));
  }
  async function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (max > 0 && pos >= max * 0.95) {
      setPos(max);
      setState("loading");
      try {
        await onConfirm();
        setState("done");
      } catch {
        setState("idle");
        setPos(0);
      }
    } else {
      setPos(0);
    }
  }

  const progress = max > 0 ? pos / max : 0;

  return (
    <div
      id="slide-track"
      className={cn(
        "relative h-14 rounded-full select-none overflow-hidden",
        variant === "income" ? "slide-track-income" : variant === "expense" ? "slide-track-expense" : "slide-track",
        disabled && "opacity-60",
      )}
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          {state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {confirmLabel}
            </>
          ) : state === "done" ? (
            <>
              <Check className="h-4 w-4 text-income" /> {doneLabel}
            </>
          ) : (
            label
          )}
        </span>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${pos}px)` }}
        className={cn(
          "absolute left-1 top-1 h-12 w-12 rounded-full grid place-items-center shadow-lg cursor-grab active:cursor-grabbing touch-none",
          "bg-primary text-primary-foreground",
          state === "done" && "bg-income",
        )}
      >
        {state === "done" ? (
          <Check className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-6 w-6" style={{ opacity: 0.4 + progress * 0.6 }} />
        )}
      </div>
    </div>
  );
}
