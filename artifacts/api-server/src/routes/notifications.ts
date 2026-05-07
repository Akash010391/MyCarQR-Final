import { Router } from "express";
import { db, notificationPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const DEFAULTS = {
  scanAlerts: true,
  smsAlerts: false,
  emailAlerts: true,
  emergencyAlerts: true,
  orderUpdates: true,
};

router.get("/me/notifications", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  let [row] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId));
  if (!row) {
    const now = new Date();
    [row] = await db
      .insert(notificationPreferencesTable)
      .values({ userId, ...DEFAULTS, updatedAt: now })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      [row] = await db
        .select()
        .from(notificationPreferencesTable)
        .where(eq(notificationPreferencesTable.userId, userId));
    }
  }
  res.json({ ...row, updatedAt: row!.updatedAt.toISOString() });
});

router.put("/me/notifications", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const b = req.body ?? {};
  const updates = {
    scanAlerts: b.scanAlerts === undefined ? DEFAULTS.scanAlerts : Boolean(b.scanAlerts),
    smsAlerts: b.smsAlerts === undefined ? DEFAULTS.smsAlerts : Boolean(b.smsAlerts),
    emailAlerts: b.emailAlerts === undefined ? DEFAULTS.emailAlerts : Boolean(b.emailAlerts),
    emergencyAlerts: b.emergencyAlerts === undefined ? DEFAULTS.emergencyAlerts : Boolean(b.emergencyAlerts),
    orderUpdates: b.orderUpdates === undefined ? DEFAULTS.orderUpdates : Boolean(b.orderUpdates),
    updatedAt: new Date(),
  };
  await db
    .insert(notificationPreferencesTable)
    .values({ userId, ...updates })
    .onConflictDoUpdate({ target: notificationPreferencesTable.userId, set: updates });
  const [row] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId));
  res.json({ ...row, updatedAt: row!.updatedAt.toISOString() });
});

export default router;
