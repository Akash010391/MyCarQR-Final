import { Router } from "express";
import {
  db, vehiclesTable, scanAlertsTable, vehicleDocumentsTable,
  usersTable, paymentSettingsTable, paymentRequestsTable,
  accidentReportsTable, lostItemsTable, sosProfilesTable, stickerOrdersTable,
} from "@workspace/db";
import { eq, count, desc, inArray, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// GET /api/admin/stats
router.get("/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [premiumUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.plan, "premium"));
    const [totalVehicles] = await db.select({ count: count() }).from(vehiclesTable);
    const [totalAlerts] = await db.select({ count: count() }).from(scanAlertsTable);
    const [totalAccidents] = await db.select({ count: count() }).from(accidentReportsTable);
    const [totalLostItems] = await db.select({ count: count() }).from(lostItemsTable);

    const pendingPayments = await db
      .select({ count: count() })
      .from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.status, "pending"));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const allAlerts = await db.select({ createdAt: scanAlertsTable.createdAt }).from(scanAlertsTable);
    const alertsToday = allAlerts.filter((a) => new Date(a.createdAt) >= startOfDay).length;

    res.json({
      totalUsers: totalUsers?.count || 0,
      premiumUsers: premiumUsers?.count || 0,
      totalVehicles: totalVehicles?.count || 0,
      totalAlerts: totalAlerts?.count || 0,
      alertsToday,
      totalScans: totalAlerts?.count || 0,
      activeSubscriptions: premiumUsers?.count || 0,
      pendingPayments: pendingPayments[0]?.count || 0,
      accidentReports: totalAccidents?.count || 0,
      lostItemReports: totalLostItems?.count || 0,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch admin stats");
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

// GET /api/admin/users
router.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    const [totalResult] = await db.select({ count: count() }).from(usersTable);
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [vehicleCount] = await db
          .select({ count: count() })
          .from(vehiclesTable)
          .where(eq(vehiclesTable.userId, user.userId));

        const userVehicles = await db
          .select({ id: vehiclesTable.id })
          .from(vehiclesTable)
          .where(eq(vehiclesTable.userId, user.userId));

        const vehicleIds = userVehicles.map((v) => v.id);
        let alertCount = 0;
        if (vehicleIds.length > 0) {
          const allAlerts = await db.select({ vehicleId: scanAlertsTable.vehicleId }).from(scanAlertsTable);
          alertCount = allAlerts.filter((a) => vehicleIds.includes(a.vehicleId)).length;
        }

        return {
          userId: user.userId,
          email: user.email || "",
          plan: user.plan,
          vehicleCount: vehicleCount?.count || 0,
          alertCount,
          createdAt: user.createdAt.toISOString(),
          isAdmin: user.isAdmin,
          premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        };
      })
    );

    res.json({ users: usersWithCounts, total: totalResult?.count || 0 });
  } catch (err) {
    req.log.error(err, "Failed to fetch admin users");
    res.status(500).json({ error: "Failed to fetch admin users" });
  }
});

// POST /api/admin/users/:userId/upgrade
router.post("/admin/users/:userId/upgrade", requireAuth, requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;
  const { plan, durationDays } = req.body;

  if (!["free", "premium"].includes(plan)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  try {
    const expiresAt = plan === "premium" && durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : plan === "premium"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null;

    const [user] = await db
      .update(usersTable)
      .set({ plan, premiumExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(usersTable.userId, userId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [vehicleCount] = await db.select({ count: count() }).from(vehiclesTable).where(eq(vehiclesTable.userId, userId));

    res.json({
      userId: user.userId,
      email: user.email || "",
      plan: user.plan,
      vehicleCount: vehicleCount?.count || 0,
      alertCount: 0,
      isAdmin: user.isAdmin,
      premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to upgrade user");
    res.status(500).json({ error: "Failed to upgrade user" });
  }
});

// GET /api/admin/alerts
router.get("/admin/alerts", requireAuth, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    const [totalResult] = await db.select({ count: count() }).from(scanAlertsTable);
    const alerts = await db.select().from(scanAlertsTable).orderBy(desc(scanAlertsTable.createdAt)).limit(limit).offset(offset);

    const vehicleIds = [...new Set(alerts.map((a) => a.vehicleId))];
    const vehicleMap = new Map<number, string>();
    for (const vid of vehicleIds) {
      const [v] = await db.select({ vehicleNumber: vehiclesTable.vehicleNumber }).from(vehiclesTable).where(eq(vehiclesTable.id, vid));
      if (v) vehicleMap.set(vid, v.vehicleNumber);
    }

    res.json({
      alerts: alerts.map((a) => ({ ...a, vehicleNumber: vehicleMap.get(a.vehicleId) || "" })),
      total: totalResult?.count || 0,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch admin alerts");
    res.status(500).json({ error: "Failed to fetch admin alerts" });
  }
});

// GET /api/admin/vehicles
router.get("/admin/vehicles", requireAuth, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    const [totalResult] = await db.select({ count: count() }).from(vehiclesTable);
    const vehicles = await db.select().from(vehiclesTable).orderBy(desc(vehiclesTable.createdAt)).limit(limit).offset(offset);

    const userIds = [...new Set(vehicles.map(v => v.userId))];
    const userEmailMap = new Map<string, string>();
    const userPlanMap = new Map<string, string>();
    for (const uid of userIds) {
      const [u] = await db.select({ email: usersTable.email, plan: usersTable.plan }).from(usersTable).where(eq(usersTable.userId, uid));
      if (u) {
        userEmailMap.set(uid, u.email || "");
        userPlanMap.set(uid, u.plan);
      }
    }

    res.json({
      vehicles: vehicles.map(v => ({
        id: v.id,
        userId: v.userId,
        email: userEmailMap.get(v.userId) || "",
        vehicleNumber: v.vehicleNumber,
        brand: v.brand || "",
        model: v.model || "",
        vehicleType: v.vehicleType || "",
        qrCode: v.qrCode,
        qrActive: v.qrActive,
        plan: userPlanMap.get(v.userId) || "free",
        createdAt: v.createdAt.toISOString(),
      })),
      total: totalResult?.count || 0,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch admin vehicles");
    res.status(500).json({ error: "Failed to fetch admin vehicles" });
  }
});

// GET /api/admin/sos-profiles
router.get("/admin/sos-profiles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const profiles = await db.select().from(sosProfilesTable).orderBy(desc(sosProfilesTable.updatedAt));
    res.json(profiles.map(p => ({ ...p, updatedAt: p.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error(err, "Failed to fetch admin SOS profiles");
    res.status(500).json({ error: "Failed to fetch admin SOS profiles" });
  }
});

// GET /api/admin/accident-reports
router.get("/admin/accident-reports", requireAuth, requireAdmin, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const reports = await db
      .select()
      .from(accidentReportsTable)
      .orderBy(desc(accidentReportsTable.reportedAt))
      .limit(limit);

    const vehicleIds = [...new Set(reports.map(r => r.vehicleId))];
    const vehicleMap = new Map<number, string>();
    for (const vid of vehicleIds) {
      const [v] = await db.select({ vehicleNumber: vehiclesTable.vehicleNumber }).from(vehiclesTable).where(eq(vehiclesTable.id, vid));
      if (v) vehicleMap.set(vid, v.vehicleNumber);
    }

    res.json({
      reports: reports.map(r => ({
        ...r,
        vehicleNumber: vehicleMap.get(r.vehicleId) ?? "",
        createdAt: r.reportedAt.toISOString(),
      })),
      total: reports.length,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch admin accident reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/lost-items
router.get("/admin/lost-items", requireAuth, requireAdmin, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const items = await db
      .select()
      .from(lostItemsTable)
      .orderBy(desc(lostItemsTable.reportedAt))
      .limit(limit);

    const vehicleIds = [...new Set(items.map(i => i.vehicleId))];
    const vehicleMap = new Map<number, string>();
    for (const vid of vehicleIds) {
      const [v] = await db.select({ vehicleNumber: vehiclesTable.vehicleNumber }).from(vehiclesTable).where(eq(vehiclesTable.id, vid));
      if (v) vehicleMap.set(vid, v.vehicleNumber);
    }

    res.json({
      items: items.map(i => ({
        ...i,
        vehicleNumber: vehicleMap.get(i.vehicleId) ?? "",
        createdAt: i.reportedAt.toISOString(),
      })),
      total: items.length,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch admin lost items");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/accident-reports/:reportId/read
router.post("/admin/accident-reports/:reportId/read", requireAuth, requireAdmin, async (req, res) => {
  const reportId = parseInt(req.params.reportId as string, 10);
  if (!Number.isFinite(reportId) || reportId <= 0) {
    res.status(400).json({ error: "Invalid reportId" });
    return;
  }

  try {
    const [updated] = await db
      .update(accidentReportsTable)
      .set({ isRead: true })
      .where(eq(accidentReportsTable.id, reportId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Report not found" }); return; }

    const [vehicle] = await db
      .select({ vehicleNumber: vehiclesTable.vehicleNumber })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, updated.vehicleId));

    res.json({
      ...updated,
      photos: (updated.photos as string[]) || [],
      vehicleNumber: vehicle?.vehicleNumber ?? "",
      reportedAt: updated.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to mark accident report handled (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/lost-items/:itemId/read
router.post("/admin/lost-items/:itemId/read", requireAuth, requireAdmin, async (req, res) => {
  const itemId = parseInt(req.params.itemId as string, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    res.status(400).json({ error: "Invalid itemId" });
    return;
  }

  try {
    const [updated] = await db
      .update(lostItemsTable)
      .set({ isRead: true })
      .where(eq(lostItemsTable.id, itemId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Item not found" }); return; }

    const [vehicle] = await db
      .select({ vehicleNumber: vehiclesTable.vehicleNumber })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, updated.vehicleId));

    res.json({
      ...updated,
      photos: (updated.photos as string[]) || [],
      vehicleNumber: vehicle?.vehicleNumber ?? "",
      reportedAt: updated.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to mark lost item handled (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Payment Settings ─────────────────────────────────────────────────────────

// PUT /api/admin/payment-settings
router.put("/admin/payment-settings", requireAuth, requireAdmin, async (req, res) => {
  const { upiId = "", qrImageBase64 = "", monthlyPrice, yearlyPrice, instructions = "" } = req.body;

  if (!monthlyPrice || !yearlyPrice) {
    res.status(400).json({ error: "monthlyPrice and yearlyPrice are required" });
    return;
  }

  try {
    const [existing] = await db.select().from(paymentSettingsTable);
    const now = new Date();

    if (existing) {
      const [updated] = await db
        .update(paymentSettingsTable)
        .set({ upiId, qrImageBase64, monthlyPrice, yearlyPrice, instructions, updatedAt: now })
        .where(eq(paymentSettingsTable.id, existing.id))
        .returning();
      res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
    } else {
      const [created] = await db
        .insert(paymentSettingsTable)
        .values({ upiId, qrImageBase64, monthlyPrice, yearlyPrice, instructions, updatedAt: now })
        .returning();
      res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
    }
  } catch (err) {
    req.log.error(err, "Failed to update payment settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Payment Request Management ───────────────────────────────────────────────

// GET /api/admin/payment-requests
router.get("/admin/payment-requests", requireAuth, requireAdmin, async (req, res) => {
  const status = req.query.status as string | undefined;

  try {
    let requests = await db
      .select()
      .from(paymentRequestsTable)
      .orderBy(desc(paymentRequestsTable.createdAt));

    if (status) requests = requests.filter(r => r.status === status);

    res.json(requests.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error(err, "Failed to fetch admin payment requests");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/payment-requests/:requestId/approve
router.post("/admin/payment-requests/:requestId/approve", requireAuth, requireAdmin, async (req, res) => {
  const requestId = parseInt(req.params.requestId as string);
  const { adminNote } = req.body;

  try {
    const [request] = await db.select().from(paymentRequestsTable).where(eq(paymentRequestsTable.id, requestId));
    if (!request) {
      res.status(404).json({ error: "Payment request not found" });
      return;
    }

    const now = new Date();
    const expiresAt = request.planType === "yearly"
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(paymentRequestsTable)
      .set({ status: "approved", adminNote: adminNote || null, reviewedAt: now, expiresAt })
      .where(eq(paymentRequestsTable.id, requestId))
      .returning();

    // Upgrade user to premium
    await db
      .update(usersTable)
      .set({ plan: "premium", premiumExpiresAt: expiresAt, updatedAt: now })
      .where(eq(usersTable.userId, request.userId));

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to approve payment request");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/payment-requests/:requestId/reject
router.post("/admin/payment-requests/:requestId/reject", requireAuth, requireAdmin, async (req, res) => {
  const requestId = parseInt(req.params.requestId as string);
  const { adminNote } = req.body;

  if (!adminNote) {
    res.status(400).json({ error: "adminNote (rejection reason) is required" });
    return;
  }

  try {
    const [updated] = await db
      .update(paymentRequestsTable)
      .set({ status: "rejected", adminNote, reviewedAt: new Date() })
      .where(eq(paymentRequestsTable.id, requestId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Payment request not found" });
      return;
    }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to reject payment request");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Sticker Orders (admin) ──────────────────────────────────────────────────

function serialiseStickerOrder(o: typeof stickerOrdersTable.$inferSelect) {
  return {
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

// GET /api/admin/sticker-orders
router.get("/admin/sticker-orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { paymentStatus, orderStatus } = req.query as Record<string, string | undefined>;

    let query = db.select().from(stickerOrdersTable).$dynamic();
    const conditions = [];
    if (paymentStatus) conditions.push(eq(stickerOrdersTable.paymentStatus, paymentStatus));
    if (orderStatus) conditions.push(eq(stickerOrdersTable.orderStatus, orderStatus));
    if (conditions.length) query = query.where(and(...conditions));

    const orders = await query.orderBy(desc(stickerOrdersTable.createdAt));
    res.json({ orders: orders.map(serialiseStickerOrder), total: orders.length });
  } catch (err) {
    req.log.error(err, "Failed to get admin sticker orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/sticker-orders/:orderId
router.put("/admin/sticker-orders/:orderId", requireAuth, requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params["orderId"] as string);
  const { paymentStatus, orderStatus, trackingNumber, adminNote } = req.body;

  try {
    const updateData: Partial<typeof stickerOrdersTable.$inferInsert> = { updatedAt: new Date() };
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (adminNote !== undefined) updateData.adminNote = adminNote;

    const [updated] = await db
      .update(stickerOrdersTable)
      .set(updateData)
      .where(eq(stickerOrdersTable.id, orderId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(serialiseStickerOrder(updated));
  } catch (err) {
    req.log.error(err, "Failed to update sticker order");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
