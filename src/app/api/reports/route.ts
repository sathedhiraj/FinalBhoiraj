import { NextResponse } from "next/server";
import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";

const INCOME_CATEGORIES = ["Vargani", "Sponsorship", "Donation"];
const EXPENSE_CATEGORIES = [
  "Mandap", "Decoration", "Puja Items", "Electricity",
  "Printing", "DJ / Sound", "Prasad", "Transport",
];

/** GET /api/reports?festivalId=&from=&to=&type= — aggregated analytics. */
export async function GET(req: Request) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const festivalId = searchParams.get("festivalId") || undefined;
  const type = searchParams.get("type") || undefined; // income | expense
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const where: Record<string, unknown> = { mandalId: ctx.mandal.id };
  if (festivalId) where.festivalId = festivalId;
  if (type) where.type = type;
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

  const transactions = await db.transaction.findMany({ where, orderBy: { date: "asc" } });

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalTransactions = transactions.length;

  // Income by category
  const incomeByCategory = INCOME_CATEGORIES.map((c) => ({
    category: c,
    amount: transactions.filter((t) => t.type === "income" && t.category === c).reduce((s, t) => s + t.amount, 0),
  }));

  // Expense by category
  const expenseByCategory = EXPENSE_CATEGORIES.map((c) => ({
    category: c,
    amount: transactions.filter((t) => t.type === "expense" && t.category === c).reduce((s, t) => s + t.amount, 0),
  }));

  // Cash vs UPI (overall, by type)
  const cashIncome = transactions.filter((t) => t.type === "income" && t.paymentMode === "cash").reduce((s, t) => s + t.amount, 0);
  const upiIncome = transactions.filter((t) => t.type === "income" && t.paymentMode === "upi").reduce((s, t) => s + t.amount, 0);
  const cashExpense = transactions.filter((t) => t.type === "expense" && t.paymentMode === "cash").reduce((s, t) => s + t.amount, 0);
  const upiExpense = transactions.filter((t) => t.type === "expense" && t.paymentMode === "upi").reduce((s, t) => s + t.amount, 0);

  // Daily collection (income) — last 30 days within filter
  const dailyMap = new Map<string, number>();
  const dailyExpenseMap = new Map<string, number>();
  for (const t of transactions) {
    const key = t.date.toISOString().slice(0, 10);
    if (t.type === "income") dailyMap.set(key, (dailyMap.get(key) ?? 0) + t.amount);
    else dailyExpenseMap.set(key, (dailyExpenseMap.get(key) ?? 0) + t.amount);
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dailyExpense = Array.from(dailyExpenseMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Monthly collection / expenses
  const monthMap = new Map<string, number>();
  const monthExpenseMap = new Map<string, number>();
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    if (t.type === "income") monthMap.set(key, (monthMap.get(key) ?? 0) + t.amount);
    else monthExpenseMap.set(key, (monthExpenseMap.get(key) ?? 0) + t.amount);
  }
  const monthly = Array.from(monthMap.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));
  const monthlyExpense = Array.from(monthExpenseMap.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json({
    totalIncome,
    totalExpense,
    balance,
    totalTransactions,
    incomeByCategory,
    expenseByCategory,
    cashVsUpi: { cashIncome, upiIncome, cashExpense, upiExpense },
    daily,
    dailyExpense,
    monthly,
    monthlyExpense,
  });
}
