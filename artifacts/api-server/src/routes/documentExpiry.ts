import { Router } from "express";
import { db, vehicleDocumentsTable, vehiclesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { sendPushToUser } from "../lib/notifications";
import { logger } from "../lib/logger";

const router = Router();

router.post("/check-document-expiry", requireAuth, requireAdmin, async (req, res) => {
  try {
    const allDocs = await db
      .select({
        id: vehicleDocumentsTable.id,
        vehicleId: vehicleDocumentsTable.vehicleId,
        documentType: vehicleDocumentsTable.documentType,
        expiryDate: vehicleDocumentsTable.expiryDate,
      })
      .from(vehicleDocumentsTable);

    const vehicles = await db.select().from(vehiclesTable);
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let notified = 0;

    for (const doc of allDocs) {
      const expiry = new Date(doc.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const vehicle = vehicleMap.get(doc.vehicleId);
      if (!vehicle) continue;

      if (diffDays === 7) {
        await sendPushToUser(vehicle.userId, {
          title: "Document Expiring Soon",
          body: `Your ${doc.documentType} for ${vehicle.vehicleNumber} expires in 7 days`,
          data: {
            type: "document_expiry",
            vehicleId: String(vehicle.id),
            route: "/documents",
          },
        });
        notified++;
      } else if (diffDays === 1) {
        await sendPushToUser(vehicle.userId, {
          title: "Document Expires Tomorrow!",
          body: `Your ${doc.documentType} for ${vehicle.vehicleNumber} expires tomorrow`,
          data: {
            type: "document_expiry",
            vehicleId: String(vehicle.id),
            route: "/documents",
          },
        });
        notified++;
      }
    }

    logger.info({ checked: allDocs.length, notified }, "Document expiry check completed");
    res.json({ checked: allDocs.length, notified });
  } catch (err) {
    req.log.error(err, "Failed to check document expiry");
    res.status(500).json({ error: "Failed to check document expiry" });
  }
});

export default router;
