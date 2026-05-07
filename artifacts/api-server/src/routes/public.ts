import { Router } from "express";
import { db, vehiclesTable, scanAlertsTable, usersTable, sosProfilesTable, accidentReportsTable, lostItemsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendPushToVehicleOwner } from "../lib/notifications";
import {
  validateScreenshot,
  validateImageMagic,
  validateImageDimensions,
} from "../lib/imageValidation";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
// Image-size only needs the file header but JPEG SOF markers can sit hundreds
// of KB into the file. 256 KB is a comfortable buffer for typical photos
// without ever fetching the full object.
const PHOTO_HEADER_BYTES = 256 * 1024;

const router = Router();

const objectStorageService = new ObjectStorageService();

// Photos arrive as one of two shapes:
//   1. Object-storage paths like "/objects/uploads/<uuid>" (new flow — bytes
//      already live in the bucket and we verify them here by fetching the
//      first chunk of the file and matching its magic bytes).
//   2. Legacy base64 data URLs ("data:image/jpeg;base64,…") that older
//      clients still send and that exist in the database from before the
//      migration. These are validated in-place via validateScreenshot, but
//      restricted to a strict JPG/JPEG/PNG/WEBP MIME whitelist (no GIF) so
//      the backend matches the frontend's `accept=` attribute.
const ALLOWED_PHOTO_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
];

async function validatePhotoArray(
  input: unknown,
  maxCount: number,
): Promise<{ ok: true; photos: string[] } | { ok: false; error: string }> {
  if (input === undefined || input === null) return { ok: true, photos: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "photos must be an array" };
  }
  const sliced = input.slice(0, maxCount);
  const out: string[] = [];
  for (let i = 0; i < sliced.length; i++) {
    const value = sliced[i];
    if (typeof value !== "string") {
      return { ok: false, error: `Photo ${i + 1} must be a string` };
    }
    if (value.startsWith("/objects/")) {
      const err = await validateObjectStoragePhoto(value);
      if (err) return { ok: false, error: `Photo ${i + 1}: ${err}` };
      out.push(value);
      continue;
    }
    if (!ALLOWED_PHOTO_PREFIXES.some((p) => value.startsWith(p))) {
      return { ok: false, error: `Photo ${i + 1} must be a JPEG, PNG, or WEBP image` };
    }
    const err = validateScreenshot(value);
    if (err) {
      const friendly = err.replace(/^Screenshot/, `Photo ${i + 1}`);
      return { ok: false, error: friendly };
    }
    out.push(value);
  }
  return { ok: true, photos: out };
}

async function validateObjectStoragePhoto(objectPath: string): Promise<string | null> {
  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();
    const declaredType = (metadata.contentType as string | undefined)?.toLowerCase() ?? "";
    if (!declaredType.startsWith("image/")) {
      return "uploaded file is not an image";
    }
    const sizeStr = metadata.size as string | number | undefined;
    const size = typeof sizeStr === "string" ? Number.parseInt(sizeStr, 10) : sizeStr ?? 0;
    if (!size || size <= 0) {
      return "uploaded file is empty";
    }
    if (size > MAX_PHOTO_BYTES) {
      return "uploaded file is too large (max 5 MB)";
    }
    const stream = file.createReadStream({ start: 0, end: PHOTO_HEADER_BYTES - 1 });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const head = new Uint8Array(Buffer.concat(chunks));
    const magicError = validateImageMagic(head);
    if (magicError) return magicError;
    const dimError = validateImageDimensions(head);
    if (dimError) return dimError;
    return null;
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return "uploaded file could not be found";
    }
    throw err;
  }
}

// ─── Helper: resolve vehicle by QR ──────────────────────────────────────────

async function resolveVehicle(qrCode: string) {
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.qrCode, qrCode), eq(vehiclesTable.qrActive, true)));
  return vehicle ?? null;
}

// GET /api/public/vehicle/:qrCode
router.get("/public/vehicle/:qrCode", async (req, res) => {
  const { qrCode } = req.params;
  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    const publicInfo: Record<string, unknown> = {
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      privacyMode: vehicle.privacyMode,
      qrCode: vehicle.qrCode,
    };

    if (!vehicle.privacyMode) {
      publicInfo.brand = vehicle.brand;
      publicInfo.model = vehicle.model;
      publicInfo.color = vehicle.color;
      publicInfo.ownerName = vehicle.ownerName;
    } else {
      publicInfo.ownerName = vehicle.ownerName.split(" ")[0] + ".";
    }

    if (vehicle.preferredContactMethod === "call" || vehicle.preferredContactMethod === "both") {
      publicInfo.primaryContact = vehicle.primaryContact;
    }
    if (vehicle.preferredContactMethod === "whatsapp" || vehicle.preferredContactMethod === "both") {
      publicInfo.whatsappNumber = vehicle.whatsappNumber;
    }
    publicInfo.preferredContactMethod = vehicle.preferredContactMethod;

    res.json(publicInfo);
  } catch (err) {
    req.log.error(err, "Failed to fetch public vehicle");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/public/vehicle/:qrCode/sos
router.get("/public/vehicle/:qrCode/sos", async (req, res) => {
  const { qrCode } = req.params;
  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    const [profile] = await db
      .select()
      .from(sosProfilesTable)
      .where(and(eq(sosProfilesTable.userId, vehicle.userId), eq(sosProfilesTable.isEnabled, true)));

    if (!profile) {
      res.status(404).json({ error: "SOS profile not enabled" });
      return;
    }

    res.json({
      emergencyContactName: profile.emergencyContactName,
      emergencyPhone: profile.emergencyPhone,
      bloodGroup: profile.bloodGroup,
      medicalNotes: profile.medicalNotes,
      altContactName: profile.altContactName,
      altContactPhone: profile.altContactPhone,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch public SOS");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/public/vehicle/:qrCode/alert
router.post("/public/vehicle/:qrCode/alert", async (req, res) => {
  const { qrCode } = req.params;
  const { alertType, message, scannerLocation } = req.body;

  if (!alertType) {
    res.status(400).json({ error: "alertType is required" });
    return;
  }

  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, vehicle.userId));

    if (user && user.plan === "free" && user.alertsThisMonth >= 5) {
      res.status(429).json({ error: "Monthly alert limit reached for this vehicle's owner" });
      return;
    }

    const [alert] = await db
      .insert(scanAlertsTable)
      .values({ vehicleId: vehicle.id, alertType, message: message || null, scannerLocation: scannerLocation || null, isRead: false })
      .returning();

    if (user) {
      await db
        .update(usersTable)
        .set({ alertsThisMonth: sql`${usersTable.alertsThisMonth} + 1` })
        .where(eq(usersTable.userId, vehicle.userId));
    }

    sendPushToVehicleOwner(vehicle.id, {
      title: `Alert: ${alertType}`,
      body: message || `Someone sent an alert for ${vehicle.vehicleNumber}`,
      data: { type: "alert", vehicleId: String(vehicle.id), route: "/alerts" },
    }).catch((e) => req.log.error(e, "Push notification failed for alert"));

    res.status(201).json({ ...alert, vehicleNumber: vehicle.vehicleNumber });
  } catch (err) {
    req.log.error(err, "Failed to send public alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/public/vehicle/:qrCode/accident
router.post("/public/vehicle/:qrCode/accident", async (req, res) => {
  const { qrCode } = req.params;
  const { description, photos = [], latitude, longitude, locationLabel } = req.body;

  if (!description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    // Validate photos: object-storage paths or legacy base64 data URLs
    const photoCheck = await validatePhotoArray(photos, 3);
    if (!photoCheck.ok) {
      res.status(400).json({ error: photoCheck.error });
      return;
    }

    const [report] = await db
      .insert(accidentReportsTable)
      .values({
        vehicleId: vehicle.id,
        description,
        photos: photoCheck.photos,
        latitude: latitude || null,
        longitude: longitude || null,
        locationLabel: locationLabel || null,
        isRead: false,
      })
      .returning();

    sendPushToVehicleOwner(vehicle.id, {
      title: "Accident Report",
      body: `An accident was reported for ${vehicle.vehicleNumber}`,
      data: { type: "accident_report", vehicleId: String(vehicle.id), route: "/accident-reports" },
    }).catch((e) => req.log.error(e, "Push notification failed for accident report"));

    res.status(201).json({
      ...report,
      photos: (report.photos as string[]) || [],
      vehicleNumber: vehicle.vehicleNumber,
      reportedAt: report.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to submit accident report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/public/vehicle/:qrCode/lost-item
router.post("/public/vehicle/:qrCode/lost-item", async (req, res) => {
  const { qrCode } = req.params;
  const { message, photos = [], latitude, longitude, locationLabel, finderContact } = req.body;

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    // Lost item submissions allow up to 2 photos (matches the frontend cap).
    const photoCheck = await validatePhotoArray(photos, 2);
    if (!photoCheck.ok) {
      res.status(400).json({ error: photoCheck.error });
      return;
    }

    const [item] = await db
      .insert(lostItemsTable)
      .values({
        vehicleId: vehicle.id,
        message,
        photos: photoCheck.photos,
        latitude: latitude || null,
        longitude: longitude || null,
        locationLabel: locationLabel || null,
        finderContact: finderContact || null,
        isRead: false,
      })
      .returning();

    sendPushToVehicleOwner(vehicle.id, {
      title: "Lost Item Found",
      body: `Someone found a lost item near ${vehicle.vehicleNumber}`,
      data: { type: "lost_item", vehicleId: String(vehicle.id), route: "/lost-items" },
    }).catch((e) => req.log.error(e, "Push notification failed for lost item"));

    res.status(201).json({
      ...item,
      photos: (item.photos as string[]) || [],
      vehicleNumber: vehicle.vehicleNumber,
      reportedAt: item.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to submit lost item report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
