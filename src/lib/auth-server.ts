import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Validate an email/password login against the users table.
 * Returns the user (without passwordHash) if valid, otherwise null.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role,
    mandalId: user.mandalId ?? undefined,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
