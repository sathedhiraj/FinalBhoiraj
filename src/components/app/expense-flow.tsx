"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/app/amount-input";
import { SlideToConfirm } from "@/components/app/slide-to-confirm";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_ICONS, PAYMENT_MODES, PAYMENT_MODE_ICONS } from "@/lib/constants";
import { api, type MeResponse, type Transaction } from "@/lib/api";
import { formatDateShort, festivalLabel, formatRupee } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronLeft, X, Check, ArrowRight, Camera, Image as ImageIcon, Trash2, User, StickyNote, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";

type Flow = {
  amount: string;
  paymentMode: "cash" | "upi";
  category: string;
  vendorName: string;
  note: string;
  billImageUrl: string | null;
  date: string;
};

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Upload failed");
  return data.url as string;
}

export function ExpenseFlow({ me, onDone }: { me: MeResponse; onDone: () => void }) {
  const festival = me.activeFestival ?? me.festivals[0];
  const [step, setStep] = useState(1);
  const [flow, setFlow] = useState<Flow>({
    amount: "",
    paymentMode: "cash",
    category: "",
    vendorName: "",
    note: "",
    billImageUrl: null,
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  function close() {
    useAppStore.getState().setFlow(null);
    onDone();
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFlow((f) => ({ ...f, billImageUrl: url }));
      toast.success("Bill image attached.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save() {
    if (!festival) {
      toast.error("No active festival. Create one first.");
      throw new Error("no festival");
    }
    setSaving(true);
    try {
      await api.post<{ transaction: Transaction }>("/api/transactions", {
        festivalId: festival.id,
        type: "expense",
        amount: Number(flow.amount),
        category: flow.category,
        paymentMode: flow.paymentMode,
        vendorName: flow.vendorName,
        note: flow.note || null,
        billImageUrl: flow.billImageUrl,
        date: flow.date,
      });
      useAppStore.getState().bumpRefresh();
      toast.success("Expense recorded. Balance updated.");
      setSuccess(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-background max-w-md mx-auto flex flex-col items-center justify-center px-8 text-center">
        <div className="grid place-items-center h-20 w-20 rounded-3xl bg-income-soft text-income mb-4">
          <Check className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Expense Recorded</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {formatRupee(Number(flow.amount))} paid to {flow.vendorName || "vendor"} for {flow.category} has been added to your entries.
        </p>
        <Button className="w-full h-12 rounded-xl mt-8 max-w-xs" onClick={close}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background max-w-md mx-auto flex flex-col">
      <div className="bg-festive px-4 pt-4 pb-4 rounded-b-2xl">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : close())}
            className="grid place-items-center h-9 w-9 rounded-full bg-white/15 ring-1 ring-white/25"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-white/80">Add Expense</p>
            <p className="font-semibold">Step {step} of 4</p>
          </div>
          <button onClick={close} className="grid place-items-center h-9 w-9 rounded-full bg-white/15 ring-1 ring-white/25">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-white" : "bg-white/30")} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto app-scroll px-5 py-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-semibold">Amount</Label>
              <AmountInput value={flow.amount} onChange={(v) => setFlow({ ...flow, amount: v })} className="mt-2" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Payment Mode</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFlow({ ...flow, paymentMode: m })}
                    className={cn(
                      "rounded-2xl ring-1 p-4 text-left transition",
                      flow.paymentMode === m ? "ring-primary bg-accent/60" : "ring-border bg-card hover:ring-primary/40",
                    )}
                  >
                    <div className="text-2xl">{PAYMENT_MODE_ICONS[m]}</div>
                    <p className="mt-1 font-semibold capitalize">{m}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold">Expense Category</Label>
              <p className="text-xs text-muted-foreground mt-0.5">What is this expense for?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFlow({ ...flow, category: c })}
                  className={cn(
                    "rounded-2xl ring-1 p-4 text-left transition",
                    flow.category === c ? "ring-primary bg-accent/60" : "ring-border bg-card hover:ring-primary/40",
                  )}
                >
                  <div className="text-2xl">{EXPENSE_CATEGORY_ICONS[c]}</div>
                  <p className="mt-1 font-semibold text-sm">{c}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold">Expense Details</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Vendor, bill image and notes.</p>
            </div>
            <div className="rounded-2xl bg-card ring-1 ring-border p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-xl font-bold">{formatRupee(Number(flow.amount))}</span>
            </div>
            <Field icon={<User className="h-4 w-4" />} label="Pay To / Vendor Name *">
              <Input
                className="h-12 rounded-xl pl-9"
                placeholder="e.g. Ravi Tent House"
                value={flow.vendorName}
                onChange={(e) => setFlow({ ...flow, vendorName: e.target.value })}
              />
            </Field>
            <Field icon={<StickyNote className="h-4 w-4" />} label="Note (Optional)">
              <Input
                className="h-12 rounded-xl pl-9"
                placeholder="Any remark…"
                value={flow.note}
                onChange={(e) => setFlow({ ...flow, note: e.target.value })}
              />
            </Field>

            <div className="space-y-1.5">
              <Label>Bill / Receipt Image</Label>
              {flow.billImageUrl ? (
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-border">
                  <img src={flow.billImageUrl} alt="Bill" className="w-full h-44 object-cover" />
                  <button
                    onClick={() => setFlow({ ...flow, billImageUrl: null })}
                    className="absolute top-2 right-2 grid place-items-center h-9 w-9 rounded-full bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    disabled={uploading}
                    className="rounded-2xl ring-1 ring-dashed ring-border p-6 flex flex-col items-center gap-2 hover:ring-primary/50"
                  >
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Camera className="h-6 w-6 text-primary" />}
                    <span className="text-xs font-medium">Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galRef.current?.click()}
                    disabled={uploading}
                    className="rounded-2xl ring-1 ring-dashed ring-border p-6 flex flex-col items-center gap-2 hover:ring-primary/50"
                  >
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-primary" />}
                    <span className="text-xs font-medium">Gallery</span>
                  </button>
                </div>
              )}
              <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickImage} />
              <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </div>
          </div>
        )}

        {step === 4 && <ReviewStep flow={flow} festivalName={festival ? festivalLabel(festival.name, festival.year) : ""} />}
      </div>

      {step < 4 && (
        <div className="px-5 pb-6 pt-2 border-t border-border bg-card">
          <Button
            className="w-full h-12 rounded-xl text-base font-semibold"
            onClick={() => {
              if (step === 1 && !(Number(flow.amount) > 0)) return toast.error("Amount must be greater than 0.");
              if (step === 2 && !flow.category) return toast.error("Select a category.");
              if (step === 3 && !flow.vendorName.trim()) return toast.error("Vendor name is required.");
              setStep(step + 1);
            }}
          >
            Continue <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="px-5 pb-6 pt-3 bg-card border-t border-border">
          <SlideToConfirm
            label="Slide to Record"
            confirmLabel="Recording…"
            doneLabel="Recorded"
            variant="expense"
            disabled={saving}
            onConfirm={save}
          />
        </div>
      )}
    </div>
  );
}

function ReviewStep({ flow, festivalName }: { flow: Flow; festivalName: string }) {
  const rows: [string, string][] = [
    ["Amount", formatRupee(Number(flow.amount))],
    ["Pay To", flow.vendorName || "—"],
    ["Expense Category", flow.category],
    ["Payment Mode", `${PAYMENT_MODE_ICONS[flow.paymentMode]} ${flow.paymentMode}`],
    ["Date", formatDateShort(flow.date)],
    ["Festival", festivalName || "—"],
  ];
  if (flow.note) rows.splice(2, 0, ["Note", flow.note]);
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Review &amp; Confirm</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Swipe the slider at the bottom to record this expense.</p>
      </div>
      <div className="rounded-3xl bg-expense-soft ring-1 ring-expense/30 p-5">
        <div className="flex items-center gap-2 mb-1 text-expense">
          <ArrowRight className="h-4 w-4 rotate-45" />
          <span className="text-xs font-semibold uppercase tracking-wide">Expense</span>
        </div>
        <p className="text-3xl font-bold text-expense">{formatRupee(Number(flow.amount))}</p>
        <div className="mt-4 divide-y divide-expense/15">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium capitalize text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>
      {flow.billImageUrl && (
        <div>
          <Label>Bill Image</Label>
          <img src={flow.billImageUrl} alt="Bill" className="mt-2 w-full rounded-2xl ring-1 ring-border object-cover max-h-60" />
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  );
}
