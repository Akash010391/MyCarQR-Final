import { Router } from "express";
import { db, sosProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/sos-profile
router.get("/sos-profile", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  try {
    const [profile] = await db.select().from(sosProfilesTable).where(eq(sosProfilesTable.userId, userId));
    if (!profile) {
      res.json({
        id: 0,
        userId,
        emergencyContactName: "",
        emergencyPhone: "",
        bloodGroup: "",
        medicalNotes: "",
        altContactName: "",
        altContactPhone: "",
        isEnabled: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    res.json({ ...profile, updatedAt: profile.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "Failed to get SOS profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/sos-profile
router.put("/sos-profile", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const {
    emergencyContactName = "",
    emergencyPhone = "",
    bloodGroup = "",
    medicalNotes = "",
    altContactName = "",
    altContactPhone = "",
    isEnabled = false,
  } = req.body;

  try {
    const [existing] = await db.select().from(sosProfilesTable).where(eq(sosProfilesTable.userId, userId));
    const now = new Date();
    if (existing) {
      const [updated] = await db
        .update(sosProfilesTable)
        .set({ emergencyContactName, emergencyPhone, bloodGroup, medicalNotes, altContactName, altContactPhone, isEnabled, updatedAt: now })
        .where(eq(sosProfilesTable.userId, userId))
        .returning();
      res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
    } else {
      const [created] = await db
        .insert(sosProfilesTable)
        .values({ userId, emergencyContactName, emergencyPhone, bloodGroup, medicalNotes, altContactName, altContactPhone, isEnabled, updatedAt: now })
        .returning();
      res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
    }
  } catch (err) {
    req.log.error(err, "Failed to upsert SOS profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
