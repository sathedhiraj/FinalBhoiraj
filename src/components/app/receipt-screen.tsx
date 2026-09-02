"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MeResponse, Transaction } from "@/lib/api";
import { formatDateDMY, festivalLabel, formatRupee } from "@/lib/format";
import { toPng } from "html-to-image";
import { Download, Share2, Check, Loader2 } from "lucide-react";


/**
 * Traditional festive Ganesh Mandal receipt.
 *
 * Design (matches the demo):
 *  - Portrait card with double red border
 *  - Top: Ganesha deity over a radial saffron->red gradient with sunburst rays
 *  - Two circular "seal" badges (mandal name + year)
 *  - Scalloped divider
 *  - Cream form area: title, subtitle, date/receipt-no, donor name, amount box
 *  - Footer: dotted line, organizer, mandal name, red bottom bar
 *
 * The card node (cardRef) is what gets exported to PNG via html-to-image.
 */
export function ReceiptScreen({ me, tx, onDone }: { me: MeResponse; tx: Transaction; onDone: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "save" | "share">(null);
  const [ganeshDataUrl, setGaneshDataUrl] = useState<string | null>(null);
  const mandal = me.mandal!;
  const festival = me.festivals.find((f) => f.id === tx.festivalId) ?? me.activeFestival;
  const receiptNo = tx.receiptNumber ?? "—";

  // Preload the Ganesha image as a data URL so html-to-image can capture it
  // without CORS/taint issues (it only captures same-origin or data-URL images).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/Bhoiraj.png");
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          if (!cancelled) setGaneshDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch {
        /* ignore — emoji fallback will be used */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Render the receipt card to a PNG Blob.
   *  We clone the card into an off-screen container with no overflow
   *  constraints so the FULL card (not just the visible scroll area) is
   *  captured — otherwise html-to-image clips to the scroll viewport.
   */
  async function getPngBlob(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const original = cardRef.current;
    // Create an off-screen wrapper that lets the card expand to full height.
    const holder = document.createElement("div");
    holder.style.cssText =
      "position:fixed;left:-99999px;top:0;width:340px;background:#ffffff;z-index:-1;";
    // Clone with inline styles + copy the scoped <style> tag so the
    // receipt CSS applies to the clone too.
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.width = "340px";
    clone.style.maxWidth = "340px";
    holder.appendChild(clone);
    // Copy the receipt <style> tag so styles apply in the clone.
    const styleTag = original.ownerDocument.querySelector("style");
    if (styleTag) {
      const styleClone = styleTag.cloneNode(true);
      holder.appendChild(styleClone);
    }
    document.body.appendChild(holder);

    try {
      // Let layout settle.
      await new Promise((r) => setTimeout(r, 80));
      const dataUrl = await toPng(clone, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        skipFonts: true,
        width: 340,
        height: clone.scrollHeight,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (e) {
      console.error("receipt render failed", e);
      toast.error("Failed to render receipt image. Please try again.");
      return null;
    } finally {
      document.body.removeChild(holder);
    }
  }

  async function saveImage() {
    setBusy("save");
    const blob = await getPngBlob();
    setBusy(null);
    if (!blob) return;
    triggerDownload(blob, `receipt-${receiptNo}.png`);
    toast.success("Receipt image saved to your device.");
  }

  async function shareReceipt() {
    setBusy("share");
    const blob = await getPngBlob();
    setBusy(null);
    if (!blob) return;
    const file = new File([blob], `receipt-${receiptNo}.png`, { type: "image/png" });

    // 1) Native Web Share with file (mobile / supported browsers)
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt ${receiptNo} — ${mandal.name}`,
          text: `Ganesh Mandal Receipt\nReceipt No: ${receiptNo}\nAmount: ${formatRupee(tx.amount)}\nDonor: ${tx.donorName ?? "-"}\nGanpati Bappa Morya!`,
        });
        toast.success("Receipt shared.");
        return;
      }
    } catch (e) {
      // User cancelling the share sheet throws AbortError — don't treat as error.
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      // otherwise fall through to fallback
    }

    // 2) Native Web Share with text only (if file share unsupported)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Receipt ${receiptNo} — ${mandal.name}`,
          text: `Ganesh Mandal Receipt\nReceipt No: ${receiptNo}\nAmount: ${formatRupee(tx.amount)}\nDonor: ${tx.donorName ?? "-"}`,
          url: window.location.href,
        });
        toast.success("Receipt details shared. (Image saved separately.)");
        // Also download the image so the user has it.
        triggerDownload(blob, `receipt-${receiptNo}.png`);
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }

    // 3) Fallback: download the image + copy details to clipboard
    triggerDownload(blob, `receipt-${receiptNo}.png`);
    try {
      await navigator.clipboard.writeText(
        `Ganesh Mandal Receipt\nReceipt No: ${receiptNo}\nAmount: ${formatRupee(tx.amount)}\nDonor: ${tx.donorName ?? "-"}\nGanpati Bappa Morya!`,
      );
      toast.success("Receipt image downloaded & details copied. Paste into WhatsApp etc.");
    } catch {
      toast.success("Receipt image downloaded. Attach it in WhatsApp/Email to share.");
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background max-w-md mx-auto flex flex-col">
      {/* Top app bar */}
      <div className="bg-festive px-4 pt-4 pb-4 rounded-b-2xl text-white shrink-0">
        <p className="text-[11px] uppercase tracking-widest text-white/80 text-center">Receipt Generated</p>
        <p className="font-semibold text-center">Receipt No. {receiptNo}</p>
      </div>

      {/* Scrollable receipt preview */}
      <div className="flex-1 overflow-y-auto app-scroll px-4 py-5 flex justify-center bg-muted/30">
        <div ref={cardRef} className="receipt-festive w-full max-w-[340px]">
          {/* === Double border frame === */}
          <div className="rc-frame">
            {/* === Top: deity header with gradient + sunburst === */}
            <div className="rc-header">
              {/* sunburst rays */}
              <div className="rc-sunburst" />
              {/* Ganesha image */}
              <div className="rc-deity">
                {ganeshDataUrl ? (
                  <img src={ganeshDataUrl} alt="Ganesh Bappa" />
                ) : (
                  <span className="text-6xl">🙏</span>
                )}
              </div>
              {/* Left badge: mandal name */}
              <div className="rc-badge rc-badge-left">
                <span className="rc-badge-text">
                  <img src="/logs.png" alt="logo" />
                </span>
              </div>
              {/* Right badge: year */}
              <div className="rc-badge rc-badge-right">
                <span className="rc-badge-year">वर्ष ७९ वे</span>
                <span className="rc-badge-sub"></span>
              </div>
              {/* scalloped divider */}
              {/*<svg className="rc-scallop" viewBox="0 0 340 24" preserveAspectRatio="none" aria-hidden>
                <path d="M0,0 Q17,24 34,0 T68,0 T102,0 T136,0 T170,0 T204,0 T238,0 T272,0 T306,0 T340,0 L340,0 L0,0 Z" />
              </svg>*/}
            </div>

            {/* === Body: cream form area === */}
            <div className="rc-body">
              {/* Main title */}
              <h2 className="rc-title">{mandal.name}</h2>
              <p className="rc-subtitle">◆ {mandal.receiptHeader || "Shree Ganesh"} ◆</p>

              {/* Date + Receipt No row */}
              <div className="rc-meta-row">
                <div className="rc-meta">
                  <span className="rc-meta-label">Date</span>
                  <span className="rc-meta-value">{formatDateDMY(tx.date)}</span>
                </div>
                <div className="rc-meta rc-meta-right">
                  <span className="rc-meta-label">Receipt No.</span>
                  <span className="rc-meta-value rc-meta-mono">{receiptNo}</span>
                </div>
              </div>

              <div className="rc-divider" />

              {/* Received from */}
              <div className="rc-field">
                <span className="rc-field-label">Received From</span>
                <span className="rc-field-value">{tx.donorName || "—"}</span>
              </div>
              {tx.mobile && (
                <div className="rc-field">
                  <span className="rc-field-label">Mobile</span>
                  <span className="rc-field-value">{tx.mobile}</span>
                </div>
              )}
              <div className="rc-field">
                <span className="rc-field-label">For (Head)</span>
                <span className="rc-field-value">{tx.category}</span>
              </div>
              <div className="rc-field">
                <span className="rc-field-label">Payment Mode</span>
                <span className="rc-field-value">{tx.paymentMode.toUpperCase()}</span>
              </div>
              {tx.note && (
                <div className="rc-field">
                  <span className="rc-field-label">Note</span>
                  <span className="rc-field-value">{tx.note}</span>
                </div>
              )}

              {/* Amount box */}
              <div className="rc-amount-wrap">
                <span className="rc-amount-label">Total Amount</span>
                <div className="rc-amount-box">
                  <span className="rc-amount-symbol">₹</span>
                  <span className="rc-amount-value">{tx.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Dotted divider */}
              <div className="rc-dotted" />

              {/* Footer */}
              <div className="rc-footer">
                <p className="rc-footer-org">— {festival ? festivalLabel(festival.name, festival.year) : ""} —</p>
                <p className="rc-footer-organizer">Organizer</p>
                <p className="rc-footer-name">{mandal.name}</p>
                <p className="rc-footer-thanks">{mandal.receiptFooter || "Ganpati Bappa Morya!"}</p>
              </div>
            </div>

            {/* Bottom red bar */}
            <div className="rc-bottom-bar" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 pt-3 bg-card border-t border-border space-y-2.5 shrink-0">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl" onClick={saveImage} disabled={!!busy}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Save Image
          </Button>
          <Button className="h-12 rounded-xl" onClick={shareReceipt} disabled={!!busy}>
            {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
            Share Receipt
          </Button>
        </div>
        <Button variant="secondary" className="w-full h-12 rounded-xl font-semibold" onClick={onDone}>
          <Check className="h-4 w-4 mr-2" /> Done
        </Button>
      </div>

      {/* Scoped receipt styles — also applied to the exported PNG. */}
      <style>{RECEIPT_CSS}</style>
    </div>
  );
}

const RECEIPT_CSS = `
.receipt-festive {
  font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.rc-frame {
  position: relative;
  border-radius: 16px;
  padding: 8px;
  background: linear-gradient(135deg, #7a1212, #9c1b1b);
  box-shadow: 0 10px 30px rgba(122,18,18,0.25);
}
.rc-frame::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 10px;
  border: 1.5px solid #fff;
  pointer-events: none;
  z-index: 2;
}
.rc-frame::after {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 9px;
  border: 1px solid #f4c542;
  pointer-events: none;
  z-index: 2;
}

/* Header */
.rc-header {
  position: relative;
  height: 220px;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% 42%, #ffb347 0%, #ff7a18 38%, #b31212 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rc-sunburst {
  position: absolute;
  inset: -20%;
  background: repeating-conic-gradient(from 0deg at 50% 42%, rgba(255,215,120,0.35) 0deg 6deg, transparent 6deg 12deg);
  pointer-events: none;
}
.rc-deity {
  position: relative;
  width: 350px;
  height: 300px;
  border-radius: none;
  overflow: hidden;
  background: radial-gradient(circle, #ffe9a8 0%, #f4c542 70%, #c98a1a 100%);
  border: 3px solid #fff;
  box-shadow: 0 0 0 3px #f4c542, 0 6px 18px rgba(0,0,0,0.35);
  display: grid;
  place-items: center;
  z-index: 1;
}
.rc-deity img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Badges */
.rc-badge {
  position: absolute;
  top: 12px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #7a1212;
  border: 2.5px solid #f4c542;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4px;
  z-index: 2;
  /* serrated edge via conic gradient mask */
  -webkit-mask: radial-gradient(circle, #000 70%, transparent 72%);
          mask: radial-gradient(circle, #000 70%, transparent 72%);
}
.rc-badge-left { left: 10px; }
.rc-badge-right { right: 10px; }
.rc-badge-text {
  color: #fff;
  font-size: 6.5px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rc-badge-year {
  color: #f4c542;
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}
.rc-badge-sub {
  color: #fff;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-top: 2px;
}

/* Scalloped divider */
.rc-scallop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  width: 100%;
  height: 20px;
  fill: #fff8ea;
  z-index: 1;
}

/* Body */
.rc-body {
  position: relative;
  background: #fff8ea;
  padding: 18px 20px 20px;
  border-radius: 0 0 8px 8px;
  z-index: 2;
}




.rc-title {
  text-align: center;
  color: #7a1212;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.rc-subtitle {
  text-align: center;
  color: #9a3412;
  font-size: 10px;
  font-weight: 600;
  margin: 0 0 14px;
  letter-spacing: 0.5px;
}

/* Meta row */
.rc-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
}
.rc-meta { display: flex; flex-direction: column; gap: 2px; }
.rc-meta-right { align-items: flex-end; text-align: right; }
.rc-meta-label {
  font-size: 9px;
  font-weight: 700;
  color: #9a3412;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.rc-meta-value {
  font-size: 12px;
  font-weight: 700;
  color: #1c1917;
}
.rc-meta-mono { font-family: "Courier New", monospace; letter-spacing: 0.5px; }

.rc-divider {
  height: 1px;
  background: repeating-linear-gradient(90deg, #d6a847 0 6px, transparent 6px 10px);
  margin: 12px 0;
}

/* Fields */
.rc-field {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed #e7d5a8;
}
.rc-field-label {
  font-size: 10px;
  font-weight: 700;
  color: #9a3412;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
.rc-field-value {
  font-size: 12px;
  font-weight: 600;
  color: #1c1917;
  text-align: right;
}

/* Amount box */
.rc-amount-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 16px 0 10px;
  gap: 6px;
}
.rc-amount-label {
  font-size: 10px;
  font-weight: 800;
  color: #7a1212;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.rc-amount-box {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid #7a1212;
  border-radius: 10px;
  padding: 8px 18px;
  background: linear-gradient(180deg, #fff 0%, #fff3d6 100%);
  box-shadow: 0 2px 6px rgba(122,18,18,0.15);
  min-width: 60%;
  justify-content: center;
}
.rc-amount-symbol {
  font-size: 20px;
  font-weight: 800;
  color: #7a1212;
}
.rc-amount-value {
  font-size: 26px;
  font-weight: 800;
  color: #7a1212;
  letter-spacing: 0.5px;
}

.rc-dotted {
  border-top: 2px dotted #c8a45a;
  margin: 14px 0 10px;
}

/* Footer */
.rc-footer { text-align: center; }
.rc-footer-org {
  font-size: 9px;
  color: #78716c;
  margin: 0 0 8px;
  font-weight: 600;
}
.rc-footer-organizer {
  font-size: 9px;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
}
.rc-footer-name {
  font-size: 12px;
  color: #7a1212;
  font-weight: 800;
  margin: 2px 0 6px;
  text-transform: uppercase;
}
.rc-footer-thanks {
  font-size: 11px;
  color: #9a3412;
  font-weight: 700;
  font-style: italic;
  margin: 0;
}

/* Bottom bar */
.rc-bottom-bar {
  height: 14px;
  border-radius: 0 0 8px 8px;
  background: linear-gradient(90deg, #7a1212 0%, #9c1b1b 50%, #7a1212 100%);
}

.rc-badge-text{
width:60px;
height:60px;
margin-top:-7px;
margin-bottom:-8px;

}


`;
