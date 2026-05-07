import { Router } from "express";
import { db, vehicleDocumentsTable, vehiclesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function computeDocumentStatus(expiryDate: string): "up_to_date" | "expiring_soon" | "expired" {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "up_to_date";
}

// GET /api/documents
router.get("/documents", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleIdParam = req.query.vehicleId ? parseInt(req.query.vehicleId as string) : undefined;

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

    let docs = await db
      .select()
      .from(vehicleDocumentsTable)
      .where(vehicleIdParam ? eq(vehicleDocumentsTable.vehicleId, vehicleIdParam) : undefined);

    docs = docs.filter((d) => vehicleIds.includes(d.vehicleId));

    const result = docs.map((d) => ({
      ...d,
      vehicleNumber: vehicleNumberMap.get(d.vehicleId) || "",
      status: computeDocumentStatus(d.expiryDate),
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err, "Failed to fetch documents");
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// POST /api/documents
router.post("/documents", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const { vehicleId, documentType, expiryDate, notes } = req.body;

  if (!vehicleId || !documentType || !expiryDate) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [vehicle] = await db
    .select({ vehicleNumber: vehiclesTable.vehicleNumber })
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)));

  if (!vehicle) {
    res.status(403).json({ error: "Vehicle not found or access denied" });
    return;
  }

  try {
    const [doc] = await db
      .insert(vehicleDocumentsTable)
      .values({ vehicleId, documentType, expiryDate, notes: notes || null })
      .returning();
    res.status(201).json({
      ...doc,
      vehicleNumber: vehicle.vehicleNumber,
      status: computeDocumentStatus(doc.expiryDate),
    });
  } catch (err) {
    req.log.error(err, "Failed to create document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

// PUT /api/documents/:documentId
router.put("/documents/:documentId", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const documentId = parseInt(req.params.documentId as string);
  const { vehicleId, documentType, expiryDate, notes } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(vehicleDocumentsTable)
      .where(eq(vehicleDocumentsTable.id, documentId));

    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const [vehicle] = await db
      .select({ vehicleNumber: vehiclesTable.vehicleNumber })
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, existing.vehicleId), eq(vehiclesTable.userId, userId)));

    if (!vehicle) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [doc] = await db
      .update(vehicleDocumentsTable)
      .set({ vehicleId, documentType, expiryDate, notes: notes || null, updatedAt: new Date() })
      .where(eq(vehicleDocumentsTable.id, documentId))
      .returning();

    res.json({
      ...doc,
      vehicleNumber: vehicle.vehicleNumber,
      status: computeDocumentStatus(doc.expiryDate),
    });
  } catch (err) {
    req.log.error(err, "Failed to update document");
    res.status(500).json({ error: "Failed to update document" });
  }
});

// DELETE /api/documents/:documentId
router.delete("/documents/:documentId", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const documentId = parseInt(req.params.documentId as string);

  try {
    const [existing] = await db
      .select()
      .from(vehicleDocumentsTable)
      .where(eq(vehicleDocumentsTable.id, documentId));

    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, existing.vehicleId), eq(vehiclesTable.userId, userId)));

    if (!vehicle) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(vehicleDocumentsTable).where(eq(vehicleDocumentsTable.id, documentId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
