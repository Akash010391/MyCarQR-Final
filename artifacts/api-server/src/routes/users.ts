import { Router } from "express";
import {
  db, vehiclesTable, scanAlertsTable, vehicleDocumentsTable, usersTable,
  paymentRequestsTable, stickerOrdersTable, accidentReportsTable, lostItemsTable,
  sosProfilesTable, notificationPreferencesTable, supportTicketsTable,
  pushTokensTable,
} from "@workspace/db";
import { eq, and, count, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";
import { isAdminEmail, getRequestEmail } from "../lib/adminEmails";

const router = Router();

/**
 * Insert/update the user row. Always set the email if we know it (so existing
 * rows missing the email get backfilled on next sign-in). Auto-promote the
 * user to admin if their email is in the static admin allowlist.
 */
async function upsertUser(userId: string, email: string | null) {
  const normalisedEmail = email ? email.trim().toLowerCase() : null;
  const adminByEmail = isAdminEmail(normalisedEmail);

  await db
    .insert(usersTable)
    .values({
      userId,
      email: normalisedEmail,
      plan: "free",
      isAdmin: adminByEmail,
    })
    .onConflictDoUpdate({
      target: usersTable.userId,
      set: {
        updatedAt: new Date(),
        // Backfill / refresh email if we now have one
        ...(normalisedEmail ? { email: normalisedEmail } : {}),
        // Allowlisted email → guarantee admin flag stays true
        ...(adminByEmail ? { isAdmin: true } : {}),
      },
    });
}

async function checkPremiumExpiry(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));
  if (user?.plan === "premium" && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
    await db
      .update(usersTable)
      .set({ plan: "free", premiumExpiresAt: null, updatedAt: new Date() })
      .where(eq(usersTable.userId, userId));
    return "free";
  }
  return user?.plan || "free";
}

// GET /api/me
router.get("/me", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  // Resolve email via session claims first, falling back to Clerk Backend API
  // so it works even when the JWT template doesn't expose `email`.
  const email = await getRequestEmail(req);

  try {
    await upsertUser(userId, email);
    const plan = await checkPremiumExpiry(userId);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));
    const [vehicleCountResult] = await db
      .select({ count: count() })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));

    // Allowlist fallback: even if DB column is somehow stale, allowlisted email
    // is treated as admin. upsertUser will already have promoted them in the DB.
    const isAdmin = !!user?.isAdmin || isAdminEmail(email);

    res.json({
      userId,
      email: user?.email || email || "",
      displayName: user?.displayName ?? null,
      phone: user?.phone ?? null,
      plan,
      vehicleCount: vehicleCountResult?.count || 0,
      alertsThisMonth: user?.alertsThisMonth || 0,
      isAdmin,
      premiumExpiresAt: user?.premiumExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch user profile");
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// PUT /api/me — update display name and phone
router.put("/me", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const { displayName, phone } = req.body;

  const MAX_NAME_LEN = 100;
  const MAX_PHONE_LEN = 20;

  if (displayName !== undefined && typeof displayName !== "string") {
    res.status(400).json({ error: "displayName must be a string" });
    return;
  }
  if (phone !== undefined && typeof phone !== "string") {
    res.status(400).json({ error: "phone must be a string" });
    return;
  }
  if (typeof displayName === "string" && displayName.length > MAX_NAME_LEN) {
    res.status(400).json({ error: `displayName must be at most ${MAX_NAME_LEN} characters` });
    return;
  }
  if (typeof phone === "string" && phone.length > MAX_PHONE_LEN) {
    res.status(400).json({ error: `phone must be at most ${MAX_PHONE_LEN} characters` });
    return;
  }

  try {
    const email = await getRequestEmail(req);
    await upsertUser(userId, email);

    await db
      .update(usersTable)
      .set({
        ...(typeof displayName === "string" ? { displayName: displayName.trim() || null } : {}),
        ...(typeof phone === "string" ? { phone: phone.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.userId, userId));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));
    const [vehicleCountResult] = await db
      .select({ count: count() })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));
    const isAdmin = !!user?.isAdmin || isAdminEmail(email);

    res.json({
      userId,
      email: user?.email || email || "",
      displayName: user?.displayName ?? null,
      phone: user?.phone ?? null,
      plan: user?.plan || "free",
      vehicleCount: vehicleCountResult?.count || 0,
      alertsThisMonth: user?.alertsThisMonth || 0,
      isAdmin,
      premiumExpiresAt: user?.premiumExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to update profile");
    res.status(500).json({ error: "Failed to save profile changes" });
  }
});

// GET /api/dashboard/summary
router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const userId = req.userId as string;

  try {
    const userVehicles = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));

    const vehicleIds = userVehicles.map((v) => v.id);
    const activeQrCodes = userVehicles.filter((v) => v.qrActive).length;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let unreadAlerts = 0;
    let totalAlertsThisMonth = 0;
    let recentAlerts: any[] = [];

    const vehicleNumberMap = new Map(userVehicles.map((v) => [v.id, v.vehicleNumber]));

    if (vehicleIds.length > 0) {
      const allAlerts = await db
        .select()
        .from(scanAlertsTable);

      const myAlerts = allAlerts.filter((a) => vehicleIds.includes(a.vehicleId));
      unreadAlerts = myAlerts.filter((a) => !a.isRead).length;
      totalAlertsThisMonth = myAlerts.filter((a) => new Date(a.createdAt) >= startOfMonth).length;
      recentAlerts = myAlerts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((a) => ({ ...a, vehicleNumber: vehicleNumberMap.get(a.vehicleId) || "" }));
    }

    let documentsExpiringSoon = 0;
    let documentsExpired = 0;

    if (vehicleIds.length > 0) {
      const docs = await db.select().from(vehicleDocumentsTable);
      const myDocs = docs.filter((d) => vehicleIds.includes(d.vehicleId));
      const now = new Date();

      for (const doc of myDocs) {
        const expiry = new Date(doc.expiryDate);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) documentsExpired++;
        else if (diffDays <= 30) documentsExpiringSoon++;
      }
    }

    const averageSafetyScore = userVehicles.length > 0
      ? Math.round(userVehicles.reduce((sum, v) => sum + v.safetyScore, 0) / userVehicles.length)
      : 0;

    res.json({
      totalVehicles: userVehicles.length,
      activeQrCodes,
      totalAlertsThisMonth,
      unreadAlerts,
      documentsExpiringSoon,
      documentsExpired,
      averageSafetyScore,
      recentAlerts,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch dashboard summary");
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// POST /api/me/push-token
router.post("/me/push-token", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const { token, platform } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    await db
      .insert(pushTokensTable)
      .values({
        userId,
        token,
        platform: platform || "android",
      })
      .onConflictDoUpdate({
        target: [pushTokensTable.userId, pushTokensTable.token],
        set: { updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to register push token");
    res.status(500).json({ error: "Failed to register push token" });
  }
});

// DELETE /api/me/push-token
router.delete("/me/push-token", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.token, token)));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete push token");
    res.status(500).json({ error: "Failed to delete push token" });
  }
});

// DELETE /api/me — permanently delete the user and all their data.
// Cascade deletes vehicles, alerts, documents, sos profile, accident reports,
// lost items, payment requests, sticker orders, support tickets, and
// notification preferences. Also attempts to delete the Clerk user so the
// session is invalidated. Requires the client to confirm by sending the user's
// own email in the body.
router.delete("/me", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  try {
    const knownEmail = (await getRequestEmail(req))?.toLowerCase() ?? null;
    const confirmEmail = typeof req.body?.confirmEmail === "string"
      ? req.body.confirmEmail.trim().toLowerCase()
      : "";
    if (!knownEmail || !confirmEmail || knownEmail !== confirmEmail) {
      res.status(400).json({ error: "Please type your account email to confirm deletion." });
      return;
    }

    // Wipe all DB data for this user atomically. If any step fails the entire
    // delete is rolled back, so we never end up half-deleted.
    await db.transaction(async (tx) => {
      const myVehicles = await tx
        .select({ id: vehiclesTable.id })
        .from(vehiclesTable)
        .where(eq(vehiclesTable.userId, userId));
      const vehicleIds = myVehicles.map((v) => v.id);

      if (vehicleIds.length > 0) {
        await tx.delete(scanAlertsTable).where(inArray(scanAlertsTable.vehicleId, vehicleIds));
        await tx.delete(vehicleDocumentsTable).where(inArray(vehicleDocumentsTable.vehicleId, vehicleIds));
        await tx.delete(accidentReportsTable).where(inArray(accidentReportsTable.vehicleId, vehicleIds));
        await tx.delete(lostItemsTable).where(inArray(lostItemsTable.vehicleId, vehicleIds));
      }

      await tx.delete(paymentRequestsTable).where(eq(paymentRequestsTable.userId, userId));
      await tx.delete(stickerOrdersTable).where(eq(stickerOrdersTable.userId, userId));
      await tx.delete(sosProfilesTable).where(eq(sosProfilesTable.userId, userId));
      await tx.delete(supportTicketsTable).where(eq(supportTicketsTable.userId, userId));
      await tx.delete(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, userId));
      await tx.delete(pushTokensTable).where(eq(pushTokensTable.userId, userId));
      await tx.delete(vehiclesTable).where(eq(vehiclesTable.userId, userId));
      await tx.delete(usersTable).where(eq(usersTable.userId, userId));
    });

    // Try to delete the Clerk user (best effort — don't fail the request if
    // Clerk is unreachable; their account is already wiped from our DB).
    try {
      await clerkClient.users.deleteUser(userId);
    } catch (e) {
      req.log.warn({ err: e, userId }, "Clerk user deletion failed (DB rows already deleted)");
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete user account");
    res.status(500).json({ error: "Could not delete account. Please contact support." });
  }
});

export default router;
