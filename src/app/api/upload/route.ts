import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/**
 * POST /api/upload — multipart file upload.
 * Saves to /public/uploads and returns the public URL.
 * Used for Mandal logo and expense bill images (replaces Firebase Storage).
 */
export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });

  const ext = path.extname(file.name || "upload.jpg").toLowerCase() || ".jpg";
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"];
  if (!allowed.includes(ext)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);

  return NextResponse.json({ url: `/uploads/${name}` });
}
