import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { isAdminEmail, getRequestEmail } from "../lib/adminEmails";

/**
 * Admin gate. Order of checks:
 *   1. DB `users.is_admin = true` → allow.
 *   2. Email allowlist (static + ADMIN_EMAILS env var) → allow AND auto-promote
 *      the row in DB so subsequent calls are fast and consistent.
 *   3. Otherwise → 403.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));

  if (user?.isAdmin) {
    next();
    return;
  }

  const email = await getRequestEmail(req);
  if (isAdminEmail(email)) {
    await db
      .update(usersTable)
      .set({ isAdmin: true, ...(email ? { email } : {}), updatedAt: new Date() })
      .where(eq(usersTable.userId, userId));
    req.log?.info({ userId, email }, "Auto-promoted allowlisted admin");
    next();
    return;
  }

  res.status(403).json({ error: "Admin access required" });
}
