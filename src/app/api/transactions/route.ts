import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";
import { formatReceiptNumber } from "@/lib/format";

const INCOME_CATEGORIES = ["Vargani", "Sponsorship", "Donation"] as const;
const EXPENSE_CATEGORIES = [
  "Mandap", "Decoration", "Puja Items", "Electricity",
  "Printing", "DJ / Sound", "Prasad", "Transport",
] as const;
const PAYMENT_MODES = ["cash", "upi"] as const;

const createSchema = z.object({
  festivalId: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.string().min(1),
  paymentMode: z.enum(PAYMENT_MODES),
  donorName: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  billImageUrl: z.string().optional().nullable(),
  date: z.string(),
});

/** GET /api/transactions — filtered list of transactions for the active/selected festival. */
export async function GET(req: Request) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const festivalId = searchParams.get("festivalId") || undefined;
  const type = searchParams.get("type") || undefined; // income | expense
  const paymentMode = searchParams.get("paymentMode") || undefined; // cash | upi
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("q") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const where: Record<string, unknown> = { mandalId: ctx.mandal.id };
  if (festivalId) where.festivalId = festivalId;
  if (type) where.type = type;
  if (paymentMode) where.paymentMode = paymentMode;
  if (category) where.category = category;

  if (from || to) {
    const range: Record<string, unknown> = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where.date = range;
  }

  if (search) {
    where.OR = [
      { donorName: { contains: search } },
      { vendorName: { contains: search } },
      { mobile: { contains: search } },
      { category: { contains: search } },
      { receiptNumber: { contains: search } },
      { note: { contains: search } },
    ];
  }

  const transactions = await db.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ transactions });
}

/** POST /api/transactions — create a transaction. Income auto-gets a receipt number. */
export async function POST(req: Request) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  // Validate category belongs to the type
  if (d.type === "income" && !(INCOME_CATEGORIES as readonly string[]).includes(d.category)) {
    return NextResponse.json({ error: "Invalid income category" }, { status: 400 });
  }
  if (d.type === "expense" && !(EXPENSE_CATEGORIES as readonly string[]).includes(d.category)) {
    return NextResponse.json({ error: "Invalid expense category" }, { status: 400 });
  }

  // Validate festival belongs to mandal
  const festival = await db.festival.findUnique({ where: { id: d.festivalId } });
  if (!festival || festival.mandalId !== ctx.mandal.id) {
    return NextResponse.json({ error: "Festival not found" }, { status: 404 });
  }

  let receiptNumber: string | null = null;
  let mandal = ctx.mandal;

  // Income transactions get an auto-incremented receipt number.
  if (d.type === "income") {
    const seq = ctx.mandal.receiptNextNumber;
    receiptNumber = formatReceiptNumber(ctx.mandal.receiptPrefix, seq);
    // Atomic-ish increment (SQLite) — read current then update.
    const updated = await db.mandal.update({
      where: { id: ctx.mandal.id },
      data: { receiptNextNumber: { increment: 1 } },
    });
    mandal = updated;
  }

  const transaction = await db.transaction.create({
    data: {
      mandalId: ctx.mandal.id,
      festivalId: d.festivalId,
      type: d.type,
      amount: d.amount,
      category: d.category,
      paymentMode: d.paymentMode,
      donorName: d.donorName ?? null,
      mobile: d.mobile ?? null,
      vendorName: d.vendorName ?? null,
      note: d.note ?? null,
      billImageUrl: d.billImageUrl ?? null,
      receiptNumber,
      date: new Date(d.date),
      createdBy: ctx.user.id,
    },
  });

  return NextResponse.json({ transaction, mandal });
}
