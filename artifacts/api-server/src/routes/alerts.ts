import { Router } from "express";
import { db, scanAlertsTable, vehiclesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/alerts
router.get("/alerts", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleIdParam = req.query.vehicleId ? parseInt(req.query.vehicleId as string) : undefined;
  const unreadOnly = req.query.unreadOnly === "true";

  try {
    const userVehicles = await db
      .select({ id: vehiclesTable.id, vehicleNumber: vehiclesTable.vehicleNumber })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));

    const vehicleIds = userVehicles.map((v) => v.id);
    const vehicleNumberMap = new Map(userVehicles.map((v) => [v.id, v.vehicleNumber]));

    if (vehicleIds.length === 0) {
      res.json([]);
      return;
    }

    let alerts = await db
      .select()
      .from(scanAlertsTable)
      .where(
        vehicleIdParam
          ? and(eq(scanAlertsTable.vehicleId, vehicleIdParam))
          : undefined
      )
      .orderBy(desc(scanAlertsTable.createdAt))
      .limit(100);

    alerts = alerts.filter((a) => vehicleIds.includes(a.vehicleId));

    if (unreadOnly) {
      alerts = alerts.filter((a) => !a.isRead);
    }

    const result = alerts.map((a) => ({
      ...a,
      vehicleNumber: vehicleNumberMap.get(a.vehicleId) || "",
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err, "Failed to fetch alerts");
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// POST /api/alerts/:alertId/read
router.post("/alerts/:alertId/read", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const alertId = parseInt(req.params.alertId as string);

  try {
    const [alert] = await db
      .select()
      .from(scanAlertsTable)
      .where(eq(scanAlertsTable.id, alertId));

    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    const [vehicle] = await db
      .select({ userId: vehiclesTable.userId, vehicleNumber: vehiclesTable.vehicleNumber })
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, alert.vehicleId), eq(vehiclesTable.userId, userId)));

    if (!vehicle) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [updated] = await db
      .update(scanAlertsTable)
      .set({ isRead: true })
      .where(eq(scanAlertsTable.id, alertId))
      .returning();

    res.json({ ...updated, vehicleNumber: vehicle.vehicleNumber });
  } catch (err) {
    req.log.error(err, "Failed to mark alert read");
    res.status(500).json({ error: "Failed to mark alert read" });
  }
});

// POST /api/alerts/mark-all-read
router.post("/alerts/mark-all-read", requireAuth, async (req, res) => {
  const userId = req.userId as string;

  try {
    const userVehicles = await db
      .select({ id: vehiclesTable.id })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));

    const vehicleIds = userVehicles.map((v) => v.id);
    let updated = 0;

    for (const vid of vehicleIds) {
      const result = await db
        .update(scanAlertsTable)
        .set({ isRead: true })
        .where(and(eq(scanAlertsTable.vehicleId, vid), eq(scanAlertsTable.isRead, false)))
        .returning();
      updated += result.length;
    }

    res.json({ updated });
  } catch (err) {
    req.log.error(err, "Failed to mark all alerts read");
    res.status(500).json({ error: "Failed to mark all alerts read" });
  }
});

export default router;
