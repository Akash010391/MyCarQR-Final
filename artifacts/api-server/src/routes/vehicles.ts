import { Router } from "express";
import { db, vehiclesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

function computeSafetyScore(vehicle: any): number {
  let score = 40;
  if (vehicle.whatsappNumber) score += 15;
  if (vehicle.emergencyContact) score += 15;
  if (vehicle.preferredContactMethod === "both") score += 10;
  if (!vehicle.privacyMode) score += 10;
  if (vehicle.qrActive) score += 10;
  return Math.min(score, 100);
}

// GET /api/vehicles
router.get("/vehicles", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  try {
    const vehicles = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));
    res.json(vehicles);
  } catch (err) {
    req.log.error(err, "Failed to fetch vehicles");
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

// POST /api/vehicles
router.post("/vehicles", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const {
    ownerName,
    vehicleType,
    vehicleNumber,
    brand,
    model,
    color,
    primaryContact,
    whatsappNumber,
    emergencyContact,
    preferredContactMethod,
    privacyMode,
  } = req.body;

  if (!ownerName || !vehicleType || !vehicleNumber || !brand || !model || !color || !primaryContact) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const qrCode = randomUUID().replace(/-/g, "").substring(0, 12);
  const safetyScore = computeSafetyScore({ whatsappNumber, emergencyContact, preferredContactMethod, privacyMode, qrActive: true });

  try {
    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({
        userId,
        ownerName,
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase(),
        brand,
        model,
        color,
        primaryContact,
        whatsappNumber: whatsappNumber || null,
        emergencyContact: emergencyContact || null,
        preferredContactMethod: preferredContactMethod || "call",
        privacyMode: !!privacyMode,
        qrCode,
        qrActive: true,
        safetyScore,
        stickerPrinted: false,
      })
      .returning();
    res.status(201).json(vehicle);
  } catch (err) {
    req.log.error(err, "Failed to create vehicle");
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

// GET /api/vehicles/:vehicleId
router.get("/vehicles/:vehicleId", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleId = parseInt(req.params.vehicleId as string);

  try {
    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)));

    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(vehicle);
  } catch (err) {
    req.log.error(err, "Failed to fetch vehicle");
    res.status(500).json({ error: "Failed to fetch vehicle" });
  }
});

// PUT /api/vehicles/:vehicleId
router.put("/vehicles/:vehicleId", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleId = parseInt(req.params.vehicleId as string);
  const {
    ownerName,
    vehicleType,
    vehicleNumber,
    brand,
    model,
    color,
    primaryContact,
    whatsappNumber,
    emergencyContact,
    preferredContactMethod,
    privacyMode,
  } = req.body;

  const safetyScore = computeSafetyScore({ whatsappNumber, emergencyContact, preferredContactMethod, privacyMode, qrActive: true });

  try {
    const [vehicle] = await db
      .update(vehiclesTable)
      .set({
        ownerName,
        vehicleType,
        vehicleNumber: vehicleNumber?.toUpperCase(),
        brand,
        model,
        color,
        primaryContact,
        whatsappNumber: whatsappNumber || null,
        emergencyContact: emergencyContact || null,
        preferredContactMethod,
        privacyMode: !!privacyMode,
        safetyScore,
        updatedAt: new Date(),
      })
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)))
      .returning();

    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(vehicle);
  } catch (err) {
    req.log.error(err, "Failed to update vehicle");
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

// DELETE /api/vehicles/:vehicleId
router.delete("/vehicles/:vehicleId", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleId = parseInt(req.params.vehicleId as string);

  try {
    await db
      .delete(vehiclesTable)
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete vehicle");
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
});

// POST /api/vehicles/:vehicleId/toggle-qr
router.post("/vehicles/:vehicleId/toggle-qr", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const vehicleId = parseInt(req.params.vehicleId as string);
  const { active } = req.body;

  try {
    const [vehicle] = await db
      .update(vehiclesTable)
      .set({ qrActive: !!active, updatedAt: new Date() })
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)))
      .returning();

    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(vehicle);
  } catch (err) {
    req.log.error(err, "Failed to toggle QR");
    res.status(500).json({ error: "Failed to toggle QR" });
  }
});

export default router;
