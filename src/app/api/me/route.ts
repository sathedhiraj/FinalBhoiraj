import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

/** Returns the current user, their mandal, all festivals, and the active festival. */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let mandal = null;
  let festivals: Awaited<ReturnType<typeof db.festival.findMany>> = [];
  let activeFestival = null;

  if (user.mandalId) {
    mandal = await db.mandal.findUnique({ where: { id: user.mandalId } });
    festivals = await db.festival.findMany({
      where: { mandalId: user.mandalId },
      orderBy: { createdAt: "desc" },
    });
    activeFestival = festivals.find((f) => f.isActive) ?? festivals[0] ?? null;
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    mandal,
    festivals,
    activeFestival,
  });
}
