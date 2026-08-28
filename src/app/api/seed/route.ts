import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";

const DEFAULT_EMAIL = "admin@mandal.in";
const DEFAULT_PASSWORD = "admin123";

/**
 * Bootstrap / recovery endpoint for the default admin account.
 *
 * - No body, or `{}`: creates the default admin IF none exists; no-ops otherwise.
 * - `{ force: true }`: RESETS the default admin's password to `admin123`
 *   (used by the "Reset to default" link on the login screen when an admin
 *   has forgotten their custom password).
 *
 * Default credentials are returned only when an account is created or reset,
 * so the operator can log in.
 */
export async function POST(req: Request) {
  let force = false;
  try {
    const body = await req.json();
    force = Boolean(body?.force);
  } catch {
    /* empty body is fine */
  }

  const existing = await db.user.findUnique({ where: { email: DEFAULT_EMAIL } });

  if (existing) {
    if (!force) {
      return NextResponse.json({ created: false, message: "An admin account already exists." });
    }
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(DEFAULT_PASSWORD) },
    });
    return NextResponse.json({
      created: false,
      reset: true,
      message: "Default admin password has been reset.",
      credentials: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD },
    });
  }

  const user = await db.user.create({
    data: {
      email: DEFAULT_EMAIL,
      name: "Mandal Admin",
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      role: "admin",
    },
  });
  return NextResponse.json({
    created: true,
    message: "Default admin created. Please change the password after logging in.",
    credentials: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD },
    userId: user.id,
  });
}
