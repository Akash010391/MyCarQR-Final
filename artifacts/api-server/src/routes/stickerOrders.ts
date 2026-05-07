import { Router } from "express";
import crypto from "crypto";
import { db, stickerOrdersTable, vehiclesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { validateScreenshot } from "../lib/imageValidation";

const router = Router();

function generateOrderCode(): string {
  const ts = Date.now();
  const rand = crypto.randomBytes(3).toString("hex");
  return `MQR-${ts}-${rand}`;
}

function serialise(o: typeof stickerOrdersTable.$inferSelect) {
  return {
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

// POST /api/sticker-orders  (authenticated user creates an order)
router.post("/sticker-orders", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const {
    vehicleId, vehicleQrCode,
    vehicleNumber: rawVehicleNumber,
    customerName, phone,
    addressLine1, addressLine2,
    city, state, pincode,
    product, amount,
    stickerStyle,
    screenshotBase64,
  } = req.body;

  const PRODUCTS: Record<string, number> = {
    basic_vinyl: 99,
    premium_weatherproof: 149,
    pack_of_3: 249,
  };

  const VALID_STYLES = new Set([
    "midnight-carbon",
    "light-premium",
    "racing-red",
    "electric-blue",
  ]);

  if (!PRODUCTS[product]) {
    res.status(400).json({ error: "Invalid product" });
    return;
  }
  const finalStyle =
    typeof stickerStyle === "string" && VALID_STYLES.has(stickerStyle)
      ? stickerStyle
      : "midnight-carbon";
  if (!customerName || !phone || !addressLine1 || !city || !state || !pincode) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (screenshotBase64) {
    const imgErr = validateScreenshot(screenshotBase64);
    if (imgErr) { res.status(400).json({ error: imgErr }); return; }
  }

  let resolvedVehicleNumber: string | null = null;
  if (typeof vehicleId === "number") {
    const [v] = await db
      .select({ vehicleNumber: vehiclesTable.vehicleNumber, userId: vehiclesTable.userId })
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)))
      .limit(1);
    if (v) {
      resolvedVehicleNumber = v.vehicleNumber;
    }
  }
  if (!resolvedVehicleNumber && typeof rawVehicleNumber === "string") {
    const trimmed = rawVehicleNumber.trim().slice(0, 32);
    if (trimmed) resolvedVehicleNumber = trimmed;
  }

  let order: typeof stickerOrdersTable.$inferSelect | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderCode = generateOrderCode();
    try {
      const [created] = await db.insert(stickerOrdersTable).values({
        orderCode,
        userId,
        vehicleId: vehicleId ?? null,
        vehicleQrCode: vehicleQrCode ?? null,
        vehicleNumber: resolvedVehicleNumber,
        customerName,
        phone,
        addressLine1,
        addressLine2: addressLine2 ?? null,
        city,
        state,
        pincode,
        product,
        amount: PRODUCTS[product],
        stickerStyle: finalStyle,
        screenshotBase64: screenshotBase64 ?? null,
        paymentStatus: "pending_verification",
        orderStatus: "pending",
      }).returning();
      order = created;
      break;
    } catch (err: any) {
      if (err?.code === "23505" && attempt < 2) {
        continue;
      }
      req.log.error(err, "Failed to create sticker order");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }

  if (!order) {
    res.status(500).json({ error: "Failed to generate unique order code" });
    return;
  }

  res.status(201).json(serialise(order));
});

// GET /api/sticker-orders  (authenticated user's own orders)
router.get("/sticker-orders", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  try {
    const orders = await db
      .select()
      .from(stickerOrdersTable)
      .where(eq(stickerOrdersTable.userId, userId))
      .orderBy(desc(stickerOrdersTable.createdAt));

    res.json({ orders: orders.map(serialise) });
  } catch (err) {
    req.log.error(err, "Failed to get sticker orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/sticker-orders/:id/screenshot  (upload payment screenshot)
router.patch("/sticker-orders/:id/screenshot", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const orderId = parseInt(req.params["id"] as string);
  const { screenshotBase64 } = req.body;
  if (!screenshotBase64) { res.status(400).json({ error: "Missing screenshot" }); return; }
  const imgErr = validateScreenshot(screenshotBase64);
  if (imgErr) { res.status(400).json({ error: imgErr }); return; }

  try {
    const [order] = await db.select().from(stickerOrdersTable).where(eq(stickerOrdersTable.id, orderId));
    if (!order || order.userId !== userId) { res.status(404).json({ error: "Order not found" }); return; }

    const [updated] = await db
      .update(stickerOrdersTable)
      .set({ screenshotBase64, paymentStatus: "screenshot_uploaded", updatedAt: new Date() })
      .where(eq(stickerOrdersTable.id, orderId))
      .returning();

    res.json(serialise(updated));
  } catch (err) {
    req.log.error(err, "Failed to upload screenshot");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
