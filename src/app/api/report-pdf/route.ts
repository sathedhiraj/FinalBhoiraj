import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";

import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateDMY, festivalLabel } from "@/lib/format";

/**
 * ---------------------------------------------------------
 * PDF FONT PATHS
 * ---------------------------------------------------------
 *
 * English:
 * NotoSans-Regular.ttf
 * NotoSans-Bold.ttf
 *
 * Hindi:
 * NotoSansDevanagari-Regular.ttf
 * NotoSansDevanagari-Bold.ttf
 */

const englishRegularFont = path.join(
  process.cwd(),
  "public",
  "fonts",
  "noto-sans.Regular.ttf"
);

const englishBoldFont = path.join(
  process.cwd(),
  "public",
  "fonts",
  "noto-sans.bold.ttf"
);

const hindiRegularFont = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansDevanagari-Regular.ttf"
);

const hindiBoldFont = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansDevanagari-Bold.ttf"
);

/**
 * ---------------------------------------------------------
 * RUPEE FORMATTER
 * ---------------------------------------------------------
 */

function pdfRupee(amount: number): string {
  const value = Number.isFinite(amount)
    ? amount
    : 0;

  return (
    "Rs. " +
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(Math.round(value))
  );
}

/**
 * ---------------------------------------------------------
 * CHECK HINDI CHARACTER
 * ---------------------------------------------------------
 */

function isHindiChar(char: string): boolean {
  return /[\u0900-\u097F]/.test(char);
}

/**
 * ---------------------------------------------------------
 * MULTI LANGUAGE TEXT
 * ---------------------------------------------------------
 *
 * Automatically switches between:
 *
 * English Noto Sans
 * Hindi Noto Sans Devanagari
 *
 * Examples:
 *
 * Rahul Sharma
 * राहुल शर्मा
 * Rahul शर्मा
 * श्री Ganesh Mandal
 * गणेश Mandal
 *
 * All will work.
 */

function drawMultilingualText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: {
    width?: number;
    align?: "left" | "center" | "right" | "justify";
    ellipsis?: boolean;
    lineBreak?: boolean;
    bold?: boolean;
  } = {}
) {
  const value = String(text ?? "");

  if (!value) {
    return;
  }

  const {
    width,
    align = "left",
    ellipsis = false,
    lineBreak = true,
    bold = false,
  } = options;

  /**
   * We split the text into small groups.
   *
   * Example:
   *
   * "Rahul शर्मा"
   *
   * becomes:
   *
   * "Rahul "
   * "शर्मा"
   */

  const parts: Array<{
    text: string;
    hindi: boolean;
  }> = [];

  let currentText = "";
  let currentHindi: boolean | null = null;

  for (const char of value) {
    const charIsHindi = isHindiChar(char);

    if (
      currentHindi !== null &&
      currentHindi !== charIsHindi
    ) {
      parts.push({
        text: currentText,
        hindi: currentHindi,
      });

      currentText = "";
    }

    currentHindi = charIsHindi;
    currentText += char;
  }

  if (currentText) {
    parts.push({
      text: currentText,
      hindi: currentHindi ?? false,
    });
  }

  /**
   * Render every part using the correct font.
   */

  let currentX = x;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    const fontName = part.hindi
      ? bold
        ? "HindiBold"
        : "HindiRegular"
      : bold
        ? "EnglishBold"
        : "EnglishRegular";

    doc.font(fontName);

    /**
     * First part uses requested position.
     *
     * Remaining parts continue from the current X
     * position.
     */

    const textOptions: PDFKit.Mixins.TextOptions = {
      width,
      align,
      ellipsis,
      lineBreak,
    };

    if (i === 0) {
      doc.text(
        part.text,
        currentX,
        y,
        textOptions
      );
    } else {
      /**
       * Calculate previous text width and continue.
       */

      const previousPart = parts[i - 1];

      const previousFontName =
        previousPart.hindi
          ? bold
            ? "HindiBold"
            : "HindiRegular"
          : bold
            ? "EnglishBold"
            : "EnglishRegular";

      doc.font(previousFontName);

      const previousWidth =
        doc.widthOfString(
          previousPart.text
        );

      currentX += previousWidth;

      doc.font(fontName);

      doc.text(
        part.text,
        currentX,
        y,
        {
          ...textOptions,
          width: width
            ? Math.max(
                width -
                  (currentX - x),
                1
              )
            : undefined,
        }
      );
    }
  }
}

/**
 * ---------------------------------------------------------
 * GET PDF
 * ---------------------------------------------------------
 */

export async function GET(req: Request) {
  /**
   * -------------------------------------------------------
   * AUTH
   * -------------------------------------------------------
   */

  const ctx =
    await requireAdminWithMandal();

  if (!ctx) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  /**
   * -------------------------------------------------------
   * REQUEST
   * -------------------------------------------------------
   */

  const { searchParams } =
    new URL(req.url);

  const festivalId =
    searchParams.get("festivalId") ||
    undefined;

  const where: Record<
    string,
    unknown
  > = {
    mandalId: ctx.mandal.id,
  };

  if (festivalId) {
    where.festivalId = festivalId;
  }

  /**
   * -------------------------------------------------------
   * TRANSACTIONS
   * -------------------------------------------------------
   */

  const transactions =
    await db.transaction.findMany({
      where,
      orderBy: [
        {
          date: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

  /**
   * -------------------------------------------------------
   * FESTIVAL
   * -------------------------------------------------------
   */

  const festival = festivalId
    ? await db.festival.findUnique({
        where: {
          id: festivalId,
        },
      })
    : await db.festival.findFirst({
        where: {
          mandalId: ctx.mandal.id,
          isActive: true,
        },
      });

  /**
   * -------------------------------------------------------
   * INCOME / EXPENSE
   * -------------------------------------------------------
   */

  const incomes =
    transactions.filter(
      (t) => t.type === "income"
    );

  const expenses =
    transactions.filter(
      (t) => t.type === "expense"
    );

  const totalIncome =
    incomes.reduce(
      (s, t) => s + t.amount,
      0
    );

  const totalExpense =
    expenses.reduce(
      (s, t) => s + t.amount,
      0
    );

  const balance =
    totalIncome - totalExpense;

  /**
   * -------------------------------------------------------
   * CREATE PDF
   * -------------------------------------------------------
   */

  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
    autoFirstPage: true,
  });

  /**
   * -------------------------------------------------------
   * REGISTER ENGLISH FONTS
   * -------------------------------------------------------
   */

  doc.registerFont(
    "EnglishRegular",
    englishRegularFont
  );

  doc.registerFont(
    "EnglishBold",
    englishBoldFont
  );

  /**
   * -------------------------------------------------------
   * REGISTER HINDI FONTS
   * -------------------------------------------------------
   */

  doc.registerFont(
    "HindiRegular",
    hindiRegularFont
  );

  doc.registerFont(
    "HindiBold",
    hindiBoldFont
  );

  /**
   * Default font
   */

  doc.font("EnglishRegular");

  const W = doc.page.width;

  const M = 40;

  const contentW =
    W - M * 2;

  /**
   * -------------------------------------------------------
   * HEADER
   * -------------------------------------------------------
   */

  doc
    .rect(
      0,
      0,
      W,
      90
    )
    .fill("#7a1212");

  /**
   * SHREE GANESH
   */

  drawMultilingualText(
    doc,
    "SHREE GANESH",
    M,
    22,
    {
      width: contentW,
      align: "center",
      bold: true,
    }
  );

  doc
    .fillColor("#f4c542")
    .fontSize(22);

  /**
   * Mandal Name
   *
   * Hindi + English both supported.
   */

  doc.fillColor("#ffffff");

  drawMultilingualText(
    doc,
    ctx.mandal.name,
    M,
    50,
    {
      width: contentW,
      align: "center",
      bold: false,
    }
  );

  doc
    .fillColor("#ffe9a8")
    .fontSize(10);

  const subtitle =
    festival
      ? festivalLabel(
          festival.name,
          festival.year
        )
      : "All Festivals";

  drawMultilingualText(
    doc,
    subtitle,
    M,
    70,
    {
      width: contentW,
      align: "center",
    }
  );

  let y = 110;

  /**
   * -------------------------------------------------------
   * REPORT INFO
   * -------------------------------------------------------
   */

  doc
    .fillColor("#333333")
    .fontSize(9);

  drawMultilingualText(
    doc,
    `Generated: ${formatDateDMY(
      new Date()
    )}  ${new Date().toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`,
    M,
    y,
    {
      width: contentW,
    }
  );

  drawMultilingualText(
    doc,
    `Transactions: ${transactions.length}   |   Festival: ${subtitle}`,
    M,
    y + 12,
    {
      width: contentW,
    }
  );

  y += 32;

  /**
   * -------------------------------------------------------
   * SUMMARY CARDS
   * -------------------------------------------------------
   */

  const cardW =
    (contentW - 20) / 3;

  drawSummaryCard(
    doc,
    M,
    y,
    cardW,
    "Total Income",
    pdfRupee(totalIncome),
    "#16a34a",
    "#dcfce7"
  );

  drawSummaryCard(
    doc,
    M + cardW + 10,
    y,
    cardW,
    "Total Expense",
    pdfRupee(totalExpense),
    "#dc2626",
    "#fee2e2"
  );

  drawSummaryCard(
    doc,
    M + 2 * (cardW + 10),
    y,
    cardW,
    "Current Balance",
    pdfRupee(balance),
    "#7a1212",
    "#fff3d6"
  );

  y += 80;

  /**
   * -------------------------------------------------------
   * INCOME
   * -------------------------------------------------------
   */

  y = drawSection(
    doc,
    y,
    "INCOME RECORDS",
    `(${incomes.length} entries)`,
    incomes,
    true,
    M,
    contentW
  );

  /**
   * -------------------------------------------------------
   * EXPENSE
   * -------------------------------------------------------
   */

  y = drawSection(
    doc,
    y + 16,
    "EXPENSE RECORDS",
    `(${expenses.length} entries)`,
    expenses,
    false,
    M,
    contentW
  );

  /**
   * -------------------------------------------------------
   * FOOTER
   * -------------------------------------------------------
   */

  if (
    y >
    doc.page.height - 80
  ) {
    doc.addPage();
    y = 60;
  }

  y += 20;

  doc
    .moveTo(M, y)
    .lineTo(W - M, y)
    .strokeColor("#f4c542")
    .lineWidth(1)
    .stroke();

  y += 8;

  /**
   * Footer can also contain Hindi + English.
   */

  doc.fillColor("#7a1212");

  drawMultilingualText(
    doc,
    ctx.mandal.receiptFooter ||
      "Ganpati Bappa Morya!",
    M,
    y,
    {
      width: contentW,
      align: "center",
      bold: true,
    }
  );

  doc.fillColor("#888888");

  drawMultilingualText(
    doc,
    ctx.mandal.address || "",
    M,
    y + 16,
    {
      width: contentW,
      align: "center",
    }
  );

  /**
   * -------------------------------------------------------
   * STREAM PDF
   * -------------------------------------------------------
   */

  const chunks: Buffer[] = [];

  doc.on(
    "data",
    (chunk: Buffer) => {
      chunks.push(chunk);
    }
  );

  const pdfBuffer: Buffer =
    await new Promise(
      (resolve) => {
        doc.on(
          "end",
          () => {
            resolve(
              Buffer.concat(
                chunks
              )
            );
          }
        );

        doc.end();
      }
    );

  /**
   * -------------------------------------------------------
   * FILE NAME
   * -------------------------------------------------------
   */

  const filename =
    `report-${ctx.mandal.name
      .replace(/\s+/g, "-")
      .toLowerCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

  /**
   * -------------------------------------------------------
   * DOWNLOAD
   * -------------------------------------------------------
   */

  return new NextResponse(
    new Uint8Array(pdfBuffer),
    {
      headers: {
        "Content-Type":
          "application/pdf",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Cache-Control":
          "no-store",
      },
    }
  );
}

/**
 * =========================================================
 * SUMMARY CARD
 * =========================================================
 */

function drawSummaryCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  accent: string,
  bg: string
) {
  doc
    .roundedRect(
      x,
      y,
      w,
      64,
      8
    )
    .fillAndStroke(
      bg,
      accent
    );

  doc.fillColor(accent);

  drawMultilingualText(
    doc,
    label.toUpperCase(),
    x + 10,
    y + 10,
    {
      width: w - 20,
      bold: true,
    }
  );

  doc.fillColor("#1c1917");

  drawMultilingualText(
    doc,
    value,
    x + 10,
    y + 28,
    {
      width: w - 20,
      bold: true,
    }
  );
}

/**
 * =========================================================
 * SECTION
 * =========================================================
 */

function drawSection(
  doc: PDFKit.PDFDocument,
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
  contentW: number
): number {
  let y = startY;

  /**
   * Section header
   */

  doc
    .roundedRect(
      M,
      y,
      contentW,
      22,
      5
    )
    .fill(
      isIncome
        ? "#16a34a"
        : "#dc2626"
    );

  doc.fillColor("#ffffff");

  drawMultilingualText(
    doc,
    title,
    M + 10,
    y + 6,
    {
      bold: true,
    }
  );

  doc.fillColor("#ffffff");

  drawMultilingualText(
    doc,
    countLabel,
    M + 140,
    y + 7,
    {
      bold: false,
    }
  );

  y += 30;

  /**
   * No records
   */

  if (rows.length === 0) {
    doc.fillColor("#9ca3af");

    drawMultilingualText(
      doc,
      "No records.",
      M,
      y
    );

    return y + 16;
  }

  /**
   * -------------------------------------------------------
   * TABLE COLUMNS
   * -------------------------------------------------------
   */

  const cols = isIncome
    ? [
        {
          key: "date",
          label: "Date",
          w: 70,
        },
        {
          key: "name",
          label: "Donor Name",
          w: 120,
        },
        {
          key: "cat",
          label: "Head",
          w: 75,
        },
        {
          key: "mode",
          label: "Mode",
          w: 45,
        },
        {
          key: "rcpt",
          label: "Receipt",
          w: 70,
        },
        {
          key: "amt",
          label: "Amount",
          w: 80,
        },
      ]
    : [
        {
          key: "date",
          label: "Date",
          w: 70,
        },
        {
          key: "name",
          label: "Vendor / Pay To",
          w: 120,
        },
        {
          key: "cat",
          label: "Category",
          w: 75,
        },
        {
          key: "mode",
          label: "Mode",
          w: 45,
        },
        {
          key: "note",
          label: "Note",
          w: 70,
        },
        {
          key: "amt",
          label: "Amount",
          w: 80,
        },
      ];

  /**
   * -------------------------------------------------------
   * TABLE HEADER
   * -------------------------------------------------------
   */

  const headerH = 18;

  doc
    .fillColor("#f3f4f6")
    .rect(
      M,
      y,
      contentW,
      headerH
    )
    .fill();

  doc.fillColor("#374151");

  let cx = M + 4;

  for (const c of cols) {
    drawMultilingualText(
      doc,
      c.label.toUpperCase(),
      cx,
      y + 6,
      {
        width: c.w - 4,
        bold: true,
      }
    );

    cx += c.w;
  }

  y += headerH;

  /**
   * -------------------------------------------------------
   * TABLE ROWS
   * -------------------------------------------------------
   */

  const rowH = 22;

  rows.forEach(
    (r, i) => {
      if (
        y >
        doc.page.height - 60
      ) {
        doc.addPage();
        y = 60;
      }

      /**
       * Alternate row background
       */

      if (i % 2 === 1) {
        doc
          .fillColor("#fafafa")
          .rect(
            M,
            y,
            contentW,
            rowH
          )
          .fill();
      }

      /**
       * Name
       */

      const name = isIncome
        ? r.donorName || "—"
        : r.vendorName || "—";

      /**
       * Values
       */

      const vals: Record<
        string,
        string
      > = {
        date:
          formatDateDMY(
            r.date
          ),

        name,

        cat:
          r.category || "—",

        mode:
          r.paymentMode
            ?.toUpperCase() ||
          "—",

        rcpt:
          r.receiptNumber ||
          "—",

        note:
          r.note || "—",

        amt:
          (isIncome
            ? "+ "
            : "− ") +
          pdfRupee(
            r.amount
          ),
      };

      /**
       * Draw every cell with automatic
       * English / Hindi font switching.
       */

      cx = M + 4;

      for (const c of cols) {
        const textColor =
          c.key === "amt"
            ? isIncome
              ? "#16a34a"
              : "#dc2626"
            : "#1c1917";

        doc.fillColor(
          textColor
        );

        drawMultilingualText(
          doc,
          vals[c.key],
          cx,
          y + 7,
          {
            width:
              c.w - 4,
            ellipsis: true,
          }
        );

        cx += c.w;
      }

      y += rowH;
    }
  );

  /**
   * -------------------------------------------------------
   * TOTAL
   * -------------------------------------------------------
   */

  if (
    y >
    doc.page.height - 40
  ) {
    doc.addPage();
    y = 60;
  }

  const total =
    rows.reduce(
      (s, r) =>
        s + r.amount,
      0
    );

  doc
    .fillColor(
      isIncome
        ? "#16a34a"
        : "#dc2626"
    )
    .rect(
      M,
      y,
      contentW,
      20
    )
    .fill();

  doc.fillColor("#ffffff");

  drawMultilingualText(
    doc,
    `TOTAL ${
      isIncome
        ? "INCOME"
        : "EXPENSE"
    }`,
    M + 10,
    y + 6,
    {
      bold: true,
    }
  );

  drawMultilingualText(
    doc,
    pdfRupee(total),
    M + contentW - 160,
    y + 6,
    {
      width: 150,
      align: "right",
      bold: true,
    }
  );

  y += 20;

  return y;
}