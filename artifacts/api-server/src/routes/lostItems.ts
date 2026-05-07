import { Router } from "express";
import { db, lostItemsTable, vehiclesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/lost-items
router.get("/lost-items", requireAuth, async (req, res) => {
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

    let items = await db.select().from(lostItemsTable)
      .where(inArray(lostItemsTable.vehicleId, vehicleIds))
      .orderBy(lostItemsTable.reportedAt);

    if (unreadOnly) items = items.filter(i => !i.isRead);

    const vehicleMap = Object.fromEntries(userVehicles.map(v => [v.id, v.vehicleNumber]));
    const result = items.reverse().map(i => ({
      ...i,
      photos: (i.photos as string[]) || [],
      vehicleNumber: vehicleMap[i.vehicleId] ?? "",
      reportedAt: i.reportedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err, "Failed to get lost items");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/lost-items/:itemId/read
router.post("/lost-items/:itemId/read", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const itemId = parseInt(req.params.itemId as string);

  try {
    const [item] = await db.select().from(lostItemsTable).where(eq(lostItemsTable.id, itemId));
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }

    const [vehicle] = await db.select().from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, item.vehicleId), eq(vehiclesTable.userId, userId)));
    if (!vehicle) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db.update(lostItemsTable)
      .set({ isRead: true }).where(eq(lostItemsTable.id, itemId)).returning();

    res.json({ ...updated, photos: (updated.photos as string[]) || [], vehicleNumber: vehicle.vehicleNumber, reportedAt: updated.reportedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "Failed to mark lost item read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
