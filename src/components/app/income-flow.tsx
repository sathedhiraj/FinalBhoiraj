"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/app/amount-input";
import { SlideToConfirm } from "@/components/app/slide-to-confirm";
import { ReceiptScreen } from "@/components/app/receipt-screen";
import { INCOME_CATEGORIES, INCOME_CATEGORY_ICONS, PAYMENT_MODES, PAYMENT_MODE_ICONS } from "@/lib/constants";
import { api, type MeResponse, type Transaction } from "@/lib/api";
import { formatDateShort, festivalLabel, formatRupee } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronLeft, X, Check, ArrowRight, User, Phone, StickyNote } from "lucide-react";
import { useAppStore } from "@/store/app-store";

type Flow = {
  amount: string;
  paymentMode: "cash" | "upi";
  category: string;
  donorName: string;
  mobile: string;
  note: string;
  date: string; // yyyy-mm-dd
};

const PHONE_RE = /^[0-9]{6,15}$/;

export function IncomeFlow({ me, onDone }: { me: MeResponse; onDone: () => void }) {
  const festival = me.activeFestival ?? me.festivals[0];
  const [step, setStep] = useState(1);
  const [flow, setFlow] = useState<Flow>({
    amount: "",
    paymentMode: "cash",
    category: "",
    donorName: "",
    mobile: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [savedTx, setSavedTx] = useState<Transaction | null>(null);

  function close() {
    clearFlow();
    onDone();
  }

  async function save() {
    if (!festival) {
      toast.error("No active festival. Create one first.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ transaction: Transaction }>("/api/transactions", {
        festivalId: festival.id,
        type: "income",
        amount: Number(flow.amount),
        category: flow.category,
        paymentMode: flow.paymentMode,
        donorName: flow.donorName,
        mobile: flow.mobile,
        note: flow.note || null,
        date: flow.date,
      });
      useAppStore.getState().bumpRefresh();
      setSavedTx(res.transaction);
      toast.success("Income recorded! Receipt generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  if (savedTx) {
    return <ReceiptScreen me={me} tx={savedTx} onDone={close} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="bg-festive px-4 pt-4 pb-4 rounded-b-2xl">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : close())}
            className="grid place-items-center h-9 w-9 rounded-full bg-white/15 ring-1 ring-white/25"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-white/80">Add Income</p>
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
          <Step1 flow={flow} setFlow={setFlow} onContinue={() => {
            if (!(Number(flow.amount) > 0)) return toast.error("Amount must be greater than 0.");
            setStep(2);
          }} />
        )}
        {step === 2 && <Step2 flow={flow} setFlow={setFlow} onContinue={() => {
          if (!flow.category) return toast.error("Select a category.");
          setStep(3);
        }} />}
        {step === 3 && <Step3 flow={flow} setFlow={setFlow} onContinue={() => {
          if (!flow.donorName.trim()) return toast.error("Donor name is required.");
          if (flow.mobile && !PHONE_RE.test(flow.mobile.replace(/\D/g, ""))) return toast.error("Enter a valid mobile number.");
          setStep(4);
        }} />}
        {step === 4 && <ReviewStep flow={flow} festivalName={festival ? festivalLabel(festival.name, festival.year) : ""} />}
      </div>

      {step < 4 && (
        <div className="px-5 pb-6 pt-2 border-t border-border bg-card">
          <Button
            className="w-full h-12 rounded-xl text-base font-semibold"
            onClick={() => {
              if (step === 1 && !(Number(flow.amount) > 0)) return toast.error("Amount must be greater than 0.");
              if (step === 2 && !flow.category) return toast.error("Select a category.");
              if (step === 3) {
                if (!flow.donorName.trim()) return toast.error("Donor name is required.");
                if (flow.mobile && !PHONE_RE.test(flow.mobile.replace(/\D/g, ""))) return toast.error("Enter a valid mobile number.");
              }
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
            label="Slide to Save"
            confirmLabel="Saving…"
            doneLabel="Saved"
            variant="income"
            disabled={saving}
            onConfirm={save}
          />
        </div>
      )}
    </div>
  );
}

// helper to clear flow on close
function clearFlow() {
  useAppStore.getState().setFlow(null);
}

function Step1({ flow, setFlow, onContinue }: { flow: Flow; setFlow: (f: Flow) => void; onContinue: () => void }) {
  return (
    <div className="space-y-6" onSubmit={onContinue}>
      <div>
        <Label className="text-sm font-semibold">Amount</Label>
        <AmountInput
          id="income-amount"
          value={flow.amount}
          onChange={(v) => setFlow({ ...flow, amount: v })}
          className="mt-2"
        />
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
  );
}

function Step2({ flow, setFlow, onContinue }: { flow: Flow; setFlow: (f: Flow) => void; onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Income Category</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Select the head this collection belongs to.</p>
      </div>
      <div className="space-y-3">
        {INCOME_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFlow({ ...flow, category: c })}
            className={cn(
              "w-full flex items-center gap-3 rounded-2xl ring-1 p-4 transition",
              flow.category === c ? "ring-primary bg-accent/60" : "ring-border bg-card hover:ring-primary/40",
            )}
          >
            <span className="grid place-items-center h-11 w-11 rounded-xl bg-income-soft text-xl">{INCOME_CATEGORY_ICONS[c]}</span>
            <span className="flex-1 text-left">
              <span className="block font-semibold">{c}</span>
              {c === "Vargani" && <span className="text-xs text-muted-foreground">वर्गणी — community contribution</span>}
            </span>
            {flow.category === c && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({ flow, setFlow, onContinue }: { flow: Flow; setFlow: (f: Flow) => void; onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Donor Details</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Who is this collection from?</p>
      </div>
      <div className="space-y-4">
        <Field icon={<User className="h-4 w-4" />} label="Donor Name *">
          <Input
            className="h-12 rounded-xl pl-9"
            placeholder="e.g. Ansha Patil"
            value={flow.donorName}
            onChange={(e) => setFlow({ ...flow, donorName: e.target.value })}
          />
        </Field>
        <Field icon={<Phone className="h-4 w-4" />} label="Mobile Number">
          <Input
            className="h-12 rounded-xl pl-9"
            inputMode="tel"
            placeholder="98765 43210"
            value={flow.mobile}
            onChange={(e) => setFlow({ ...flow, mobile: e.target.value })}
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
      </div>
    </div>
  );
}

function ReviewStep({ flow, festivalName }: { flow: Flow; festivalName: string }) {
  const rows: [string, string][] = [
    ["Amount", formatRupee(Number(flow.amount))],
    ["Donor Name", flow.donorName || "—"],
    ["Head", flow.category],
    ["Payment Mode", `${PAYMENT_MODE_ICONS[flow.paymentMode]} ${flow.paymentMode}`],
    ["Date", formatDateShort(flow.date)],
    ["Festival", festivalName || "—"],
  ];
  if (flow.mobile) rows.splice(2, 0, ["Mobile", flow.mobile]);
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Review &amp; Confirm</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Swipe the slider at the bottom to save this income.</p>
      </div>
      <div className="rounded-3xl bg-income-soft ring-1 ring-income/30 p-5">
        <div className="flex items-center gap-2 mb-1 text-income">
          <ArrowRight className="h-4 w-4 rotate-[-45deg]" />
          <span className="text-xs font-semibold uppercase tracking-wide">Income</span>
        </div>
        <p className="text-3xl font-bold text-income">{formatRupee(Number(flow.amount))}</p>
        <div className="mt-4 divide-y divide-income/15">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium capitalize text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>
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
