import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1, "Mandal name is required"),
  address: z.string().min(1, "Address is required"),
  establishedYear: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  registrationNumber: z.string().min(1, "Registration number is required"),
  phone: z.string().min(6, "A valid WhatsApp/Mobile number is required"),
  logoUrl: z.string().nullable().optional(),
});

/** GET /api/mandal — current user's mandal. */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.mandalId) return NextResponse.json({ mandal: null });
  const mandal = await db.mandal.findUnique({ where: { id: user.mandalId } });
  return NextResponse.json({ mandal });
}

/** POST /api/mandal — create mandal + an initial active festival for this admin. */
export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.mandalId) return NextResponse.json({ error: "Mandal already exists" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  const mandal = await db.mandal.create({
    data: {
      name: d.name,
      address: d.address,
      establishedYear: d.establishedYear,
      registrationNumber: d.registrationNumber,
      phone: d.phone,
      logoUrl: d.logoUrl ?? null,
    },
  });

  // Link admin to mandal
  await db.user.update({ where: { id: user.id }, data: { mandalId: mandal.id } });

  // Create the first festival and mark it active
  const year = new Date().getFullYear();
  const festival = await db.festival.create({
    data: {
      mandalId: mandal.id,
      name: `Ganesh Utsav ${year}`,
      year,
      status: "active",
      isActive: true,
    },
  });

  return NextResponse.json({ mandal, festival });
}

/** PATCH /api/mandal — update mandal details + receipt settings. */
export async function PATCH(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.mandalId) return NextResponse.json({ error: "No mandal" }, { status: 400 });

  const json = await req.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const key of [
    "name", "address", "registrationNumber", "phone", "logoUrl",
    "establishedYear", "receiptHeader", "receiptFooter", "receiptPrefix",
  ]) {
    if (key in json) data[key] = json[key];
  }
  if (typeof data.establishedYear === "string") data.establishedYear = parseInt(data.establishedYear, 10);

  const mandal = await db.mandal.update({ where: { id: user.mandalId }, data });
  return NextResponse.json({ mandal });
}
