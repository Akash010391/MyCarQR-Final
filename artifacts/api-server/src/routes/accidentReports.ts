import { Router } from "express";
import { db, accidentReportsTable, vehiclesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/accident-reports
router.get("/accident-reports", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleId = req.query.vehicleId ? parseInt(req.query.vehicleId as string) : undefined;
  const unreadOnly = req.query.unreadOnly === "true";

  try {
    const userVehicles = await db.select({ id: vehiclesTable.id, vehicleNumber: vehiclesTable.vehicleNumber })
      .from(vehiclesTable).where(eq(vehiclesTable.userId, userId));

    if (!userVehicles.length) { res.json([]); return; }

    const vehicleIds = vehicleId
      ? userVehicles.filter(v => v.id === vehicleId).map(v => v.id)
      : userVehicles.map(v => v.id);

    if (!vehicleIds.length) { res.json([]); return; }

    let reports = await db.select().from(accidentReportsTable)
      .where(inArray(accidentReportsTable.vehicleId, vehicleIds))
      .orderBy(accidentReportsTable.reportedAt);

    if (unreadOnly) reports = reports.filter(r => !r.isRead);

    const vehicleMap = Object.fromEntries(userVehicles.map(v => [v.id, v.vehicleNumber]));
    const result = reports.reverse().map(r => ({
      ...r,
      photos: (r.photos as string[]) || [],
      vehicleNumber: vehicleMap[r.vehicleId] ?? "",
      reportedAt: r.reportedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err, "Failed to get accident reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/accident-reports/:reportId/read
router.post("/accident-reports/:reportId/read", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const reportId = parseInt(req.params.reportId as string);

  try {
    const [report] = await db.select().from(accidentReportsTable).where(eq(accidentReportsTable.id, reportId));
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }

    const [vehicle] = await db.select().from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, report.vehicleId), eq(vehiclesTable.userId, userId)));
    if (!vehicle) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db.update(accidentReportsTable)
      .set({ isRead: true }).where(eq(accidentReportsTable.id, reportId)).returning();

    res.json({ ...updated, photos: (updated.photos as string[]) || [], vehicleNumber: vehicle.vehicleNumber, reportedAt: updated.reportedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "Failed to mark accident report read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
