import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";

/**
 * One-time bootstrap: creates a default admin account if none exists yet.
 * Safe to call repeatedly — it no-ops once an admin exists.
 *
 * Default credentials are returned ONLY the first time so the operator can log in.
 */
export async function POST() {
  const existing = await db.user.findFirst({ where: { role: "admin" } });
  if (existing) {
    return NextResponse.json({ created: false, message: "An admin account already exists." });
  }
  const email = "admin@mandal.in";
  const password = "admin123";
  const user = await db.user.create({
    data: {
      email,
      name: "Mandal Admin",
      passwordHash: await hashPassword(password),
      role: "admin",
    },
  });
  return NextResponse.json({
    created: true,
    message: "Default admin created. Please change the password after logging in.",
    credentials: { email, password },
    userId: user.id,
  });
}
