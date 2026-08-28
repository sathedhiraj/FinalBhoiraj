import { NextResponse } from "next/server";
import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";

/** PATCH /api/festivals/[id] — activate/close a festival. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await req.json().catch(() => ({}));

  const festival = await db.festival.findUnique({ where: { id } });
  if (!festival || festival.mandalId !== ctx.mandal.id) {
    return NextResponse.json({ error: "Festival not found" }, { status: 404 });
  }

  if (json.activate) {
    await db.festival.updateMany({ where: { mandalId: ctx.mandal.id }, data: { isActive: false } });
    await db.festival.update({ where: { id }, data: { isActive: true, status: "active" } });
    return NextResponse.json({ ok: true });
  }
  if (typeof json.status === "string") {
    await db.festival.update({ where: { id }, data: { status: json.status } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
