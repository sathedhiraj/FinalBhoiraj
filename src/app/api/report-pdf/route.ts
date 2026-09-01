import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateDMY, festivalLabel } from "@/lib/format";

/**
 * PDF-safe rupee formatter. PDFKit's default Helvetica font does NOT include
 * the Indian Rupee glyph (₹, U+20B8) — it renders as a fallback box/"1"-like
 * char. We use "Rs." instead so amounts are correct and unambiguous in the PDF.
 */
function pdfRupee(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

/**
 * GET /api/report-pdf?festivalId=...
 * Generates a full PDF report containing:
 *  - Mandal header + festival + generated date
 *  - Balance summary (Total Income, Total Expense, Current Balance)
 *  - Income records table (with donor names)
 *  - Expense records table (with vendor names)
 *
 * Streams the PDF back as an attachment download.
 */
export async function GET(req: Request) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const festivalId = searchParams.get("festivalId") || undefined;

  const where: Record<string, unknown> = { mandalId: ctx.mandal.id };
  if (festivalId) where.festivalId = festivalId;

  const transactions = await db.transaction.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const festival = festivalId
    ? await db.festival.findUnique({ where: { id: festivalId } })
    : await db.festival.findFirst({ where: { mandalId: ctx.mandal.id, isActive: true } });

  const incomes = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Build the PDF
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.registerFont("regular", "Helvetica");
  doc.registerFont("bold", "Helvetica-Bold");

  const W = doc.page.width;
  const M = 40;
  const contentW = W - M * 2;

  // ---- Header band (maroon) ----
  doc.rect(0, 0, W, 90).fill("#7a1212");
  doc.fillColor("#f4c542").font("bold").fontSize(22).text("SHREE GANESH", M, 22, { align: "center" });
  doc.fillColor("#ffffff").fontSize(15).text(ctx.mandal.name, M, 50, { align: "center" });
  const subtitle = festival ? festivalLabel(festival.name, festival.year) : "All Festivals";
  doc.fillColor("#ffe9a8").fontSize(10).text(subtitle, M, 70, { align: "center" });

  let y = 110;
  doc.fillColor("#333333").font("regular").fontSize(9);
  doc.text(`Generated: ${formatDateDMY(new Date())}  ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`, M, y);
  doc.text(`Transactions: ${transactions.length}   |   Festival: ${subtitle}`, M, y + 12);
  y += 32;

  // ---- Balance summary cards ----
  const cardW = (contentW - 20) / 3;
  drawSummaryCard(doc, M, y, cardW, "Total Income", pdfRupee(totalIncome), "#16a34a", "#dcfce7");
  drawSummaryCard(doc, M + cardW + 10, y, cardW, "Total Expense", pdfRupee(totalExpense), "#dc2626", "#fee2e2");
  drawSummaryCard(doc, M + 2 * (cardW + 10), y, cardW, "Current Balance", pdfRupee(balance), "#7a1212", "#fff3d6");
  y += 80;

  // ---- Income section ----
  y = drawSection(doc, y, "INCOME RECORDS", `(${incomes.length} entries)`, incomes, true, M, contentW);
  // ---- Expense section ----
  y = drawSection(doc, y + 16, "EXPENSE RECORDS", `(${expenses.length} entries)`, expenses, false, M, contentW);

  // ---- Footer ----
  if (y > doc.page.height - 80) {
    doc.addPage();
    y = 60;
  }
  y += 20;
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor("#f4c542").lineWidth(1).stroke();
  y += 8;
  doc.fillColor("#7a1212").font("bold").fontSize(12).text(ctx.mandal.receiptFooter || "Ganpati Bappa Morya!", M, y, { align: "center" });
  doc.fillColor("#888888").font("regular").fontSize(8).text(ctx.mandal.address, M, y + 16, { align: "center" });

  // Stream out
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.end();
  });

  const filename = `report-${ctx.mandal.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Draw a summary card with label + value. */
function drawSummaryCard(
  doc: PDFDocument.PDFDocument,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  accent: string,
  bg: string,
) {
  doc.roundedRect(x, y, w, 64, 8).fillAndStroke(bg, accent);
  doc.fillColor(accent).font("bold").fontSize(8).text(label.toUpperCase(), x + 10, y + 10, { width: w - 20 });
  doc.fillColor("#1c1917").font("bold").fontSize(15).text(value, x + 10, y + 28, { width: w - 20 });
}

/**
 * Draw a section header + a table of transactions.
 * Returns the Y position after the section.
 */
function drawSection(
  doc: PDFDocument.PDFDocument,
  startY: number,
  title: string,
  countLabel: string,
  rows: Array<{
    date: Date;
    amount: number;
    category: string;
    paymentMode: string;
    donorName: string | null;
    vendorName: string | null;
    mobile: string | null;
    receiptNumber: string | null;
    note: string | null;
  }>,
  isIncome: boolean,
  M: number,
  contentW: number,
): number {
  let y = startY;
  // Section header bar
  doc.roundedRect(M, y, contentW, 22, 5).fill(isIncome ? "#16a34a" : "#dc2626");
  doc.fillColor("#ffffff").font("bold").fontSize(11).text(title, M + 10, y + 6);
  doc.fillColor("#ffffff").font("regular").fontSize(9).text(countLabel, M + 10 + 130, y + 7);
  y += 30;

  if (rows.length === 0) {
    doc.fillColor("#9ca3af").font("italic").fontSize(9).text("No records.", M, y);
    return y + 16;
  }

  // Table header
  const cols = isIncome
    ? [
        { key: "date", label: "Date", w: 70 },
        { key: "name", label: "Donor Name", w: 120 },
        { key: "cat", label: "Head", w: 75 },
        { key: "mode", label: "Mode", w: 45 },
        { key: "rcpt", label: "Receipt", w: 70 },
        { key: "amt", label: "Amount", w: 80 },
      ]
    : [
        { key: "date", label: "Date", w: 70 },
        { key: "name", label: "Vendor / Pay To", w: 120 },
        { key: "cat", label: "Category", w: 75 },
        { key: "mode", label: "Mode", w: 45 },
        { key: "note", label: "Note", w: 70 },
        { key: "amt", label: "Amount", w: 80 },
      ];

  const headerH = 18;
  doc.fillColor("#f3f4f6").rect(M, y, contentW, headerH).fill();
  doc.fillColor("#374151").font("bold").fontSize(8);
  let cx = M + 4;
  for (const c of cols) {
    doc.text(c.label.toUpperCase(), cx, y + 6, { width: c.w - 4 });
    cx += c.w;
  }
  y += headerH;

  // Rows
  doc.font("regular").fontSize(8);
  const rowH = 22;
  rows.forEach((r, i) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 60;
    }
    if (i % 2 === 1) {
      doc.fillColor("#fafafa").rect(M, y, contentW, rowH).fill();
    }
    const name = isIncome ? (r.donorName || "—") : (r.vendorName || "—");
    const vals: Record<string, string> = {
      date: formatDateDMY(r.date),
      name,
      cat: r.category,
      mode: r.paymentMode.toUpperCase(),
      rcpt: r.receiptNumber || "—",
      note: r.note || "—",
      amt: (isIncome ? "+ " : "− ") + pdfRupee(r.amount),
    };
    doc.fillColor("#1c1917");
    cx = M + 4;
    for (const c of cols) {
      const color = c.key === "amt" ? (isIncome ? "#16a34a" : "#dc2626") : "#1c1917";
      doc.fillColor(color);
      doc.text(vals[c.key], cx, y + 7, { width: c.w - 4, ellipsis: true });
      cx += c.w;
    }
    y += rowH;
  });

  // Section total
  if (y > doc.page.height - 40) {
    doc.addPage();
    y = 60;
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  doc.fillColor(isIncome ? "#16a34a" : "#dc2626").rect(M, y, contentW, 20).fill();
  doc.fillColor("#ffffff").font("bold").fontSize(10);
  doc.text(`TOTAL ${isIncome ? "INCOME" : "EXPENSE"}`, M + 10, y + 6);
  doc.text(pdfRupee(total), M + contentW - 160, y + 6, { width: 150, align: "right" });
  y += 20;
  return y;
}
