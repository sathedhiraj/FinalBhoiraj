"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MeResponse, Transaction } from "@/lib/api";
import { formatDateDMY, festivalLabel, formatRupee } from "@/lib/format";
import { toPng } from "html-to-image";
import { Download, Share2, Check } from "lucide-react";
import { Loader2 } from "lucide-react";

export function ReceiptScreen({ me, tx, onDone }: { me: MeResponse; tx: Transaction; onDone: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "save" | "share">(null);
  const mandal = me.mandal!;
  const festival = me.festivals.find((f) => f.id === tx.festivalId) ?? me.activeFestival;

  async function getPngBlob(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true, backgroundColor: "#fffdf7" });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (e) {
      toast.error("Failed to render receipt image.");
      return null;
    }
  }

  async function saveImage() {
    setBusy("save");
    const blob = await getPngBlob();
    setBusy(null);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${tx.receiptNumber ?? tx.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Receipt image saved.");
  }

  async function shareReceipt() {
    setBusy("share");
    const blob = await getPngBlob();
    setBusy(null);
    if (!blob) return;
    const file = new File([blob], `receipt-${tx.receiptNumber ?? tx.id}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ganesh Mandal Receipt", text: `Receipt ${tx.receiptNumber}` });
        return;
      }
    } catch {
      /* fall through to download */
    }
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Sharing not supported here — image downloaded instead.");
  }

  return (
    <div className="fixed inset-0 z-50 bg-background max-w-md mx-auto flex flex-col">
      <div className="bg-festive px-4 pt-4 pb-4 rounded-b-2xl text-white">
        <p className="text-[11px] uppercase tracking-widest text-white/80 text-center">Receipt Generated</p>
        <p className="font-semibold text-center">Receipt No. {tx.receiptNumber ?? "—"}</p>
      </div>

      <div className="flex-1 overflow-y-auto app-scroll px-5 py-6 flex justify-center">
        {/* Receipt card (this exact node is exported to image) */}
        <div
          ref={cardRef}
          className="receipt-card w-full max-w-sm rounded-3xl ring-1 ring-amber-200 shadow-2xl p-6 relative overflow-hidden"
        >
          {/* decorative top border */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          <div className="text-center pt-1">
            {mandal.logoUrl ? (
              <img src={mandal.logoUrl} alt="logo" className="mx-auto h-16 w-16 object-contain rounded-xl" />
            ) : (
              <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-amber-100 text-3xl">🙏</div>
            )}
            <p className="mt-3 text-xl font-bold text-amber-800">{mandal.receiptHeader || "Shree Ganesh"}</p>
            <p className="text-lg font-bold text-stone-800 mt-0.5">{mandal.name}</p>
            <p className="text-sm text-stone-600">{festival ? festivalLabel(festival.name, festival.year) : ""}</p>
            <div className="mx-auto mt-2 h-px w-2/3 bg-amber-300" />
          </div>

          <div className="mt-5 space-y-2.5 text-sm text-stone-800">
            <Row label="Receipt No." value={tx.receiptNumber ?? "—"} />
            <Row label="Date" value={formatDateDMY(tx.date)} />
            <div className="h-px bg-amber-200 my-1" />
            <Row label="Received from" value={tx.donorName || "—"} />
            {tx.mobile && <Row label="Mobile" value={tx.mobile} />}
            <Row label="For" value={tx.category} />
            <Row label="Payment Mode" value={tx.paymentMode.toUpperCase()} />
            <div className="h-px bg-amber-200 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Amount</span>
              <span className="text-2xl font-extrabold text-amber-800">{formatRupee(tx.amount)}</span>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-base font-bold text-stone-800">Thank You</p>
            <p className="mt-1 text-amber-700 font-semibold">{mandal.receiptFooter || "Ganpati Bappa Morya!"}</p>
            <div className="mx-auto mt-3 h-px w-1/2 bg-amber-300" />
            <p className="mt-2 text-[10px] text-stone-400">{mandal.address}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-6 pt-3 bg-card border-t border-border space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl" onClick={saveImage} disabled={!!busy}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Save Image
          </Button>
          <Button variant="outline" className="h-12 rounded-xl" onClick={shareReceipt} disabled={!!busy}>
            {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
            Share Receipt
          </Button>
        </div>
        <Button className="w-full h-12 rounded-xl font-semibold" onClick={onDone}>
          <Check className="h-4 w-4 mr-2" /> Done
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-stone-600">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
