import { NextResponse } from "next/server";
import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";

/** DELETE /api/transactions/[id] — delete a transaction (admin only). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const tx = await db.transaction.findUnique({ where: { id } });
  if (!tx || tx.mandalId !== ctx.mandal.id) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  await db.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
