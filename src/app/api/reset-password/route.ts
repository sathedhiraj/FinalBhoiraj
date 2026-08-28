import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";
import { z } from "zod";

/**
 * In-app password reset.
 *
 * NOTE: In production this would send an email with a one-time token. In this
 * sandbox there is no mail server, so we reset directly given the email + a
 * new password (the UI clearly notes this is a sandbox-only behaviour).
 */
const bodySchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, newPassword } = parsed.data;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    // Don't leak whether the email exists.
    return NextResponse.json({ ok: true, message: "If the account exists, the password was reset." });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return NextResponse.json({ ok: true, message: "Password reset successful. You can now log in." });
}
