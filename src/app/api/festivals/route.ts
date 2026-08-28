import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminWithMandal } from "@/lib/session";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1, "Festival name is required"),
  year: z.number().int().min(1900).max(2100),
});

/** GET /api/festivals — list festivals for current mandal. */
export async function GET() {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const festivals = await db.festival.findMany({
    where: { mandalId: ctx.mandal.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ festivals, activeFestival: festivals.find((f) => f.isActive) ?? festivals[0] ?? null });
}

/** POST /api/festivals — create a new festival and (optionally) activate it. */
export async function POST(req: Request) {
  const ctx = await requireAdminWithMandal();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, year } = parsed.data;
  const activate = Boolean(json?.activate);

  const festival = await db.festival.create({
    data: { mandalId: ctx.mandal.id, name, year, status: "active", isActive: false },
  });

  if (activate) {
    await db.festival.updateMany({ where: { mandalId: ctx.mandal.id }, data: { isActive: false } });
    await db.festival.update({ where: { id: festival.id }, data: { isActive: true } });
  }
  return NextResponse.json({ festival });
}
