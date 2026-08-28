import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** Returns the authenticated session or null. */
export async function getSession() {
  return getServerSession(authOptions);
}

/** Throws/returns null caller can handle. Returns the session + the user's mandal. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, mandalId: true },
  });
  if (!user) return null;
  return user;
}

/** Require admin AND an existing mandal; returns user + mandal or null. */
export async function requireAdminWithMandal() {
  const user = await requireAdmin();
  if (!user || !user.mandalId) return null;
  const mandal = await db.mandal.findUnique({ where: { id: user.mandalId } });
  if (!mandal) return null;
  return { user, mandal };
}
