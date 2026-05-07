import { Router } from "express";
import { db, qrSettings, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_SETTINGS = {
  brandName: "MyCarQR",
  tagline: "Scan. Connect. Stay Safe.",
  ctaText: "Scan to Connect",
  enabledThemes: ["minimal-white", "classic-black-gold", "sporty-red", "royal-gold", "neon-blue", "army-green", "corporate-blue", "emergency-red"],
  premiumThemes: ["classic-black-gold", "sporty-red", "royal-gold", "neon-blue", "army-green", "corporate-blue", "emergency-red"],
};

async function ensureDefaultQrSettings() {
  const [existing] = await db.select().from(qrSettings);
  if (!existing) {
    await db.insert(qrSettings).values({ ...DEFAULT_SETTINGS, updatedAt: new Date() });
  }
  return existing ?? (await db.select().from(qrSettings))[0];
}

// GET /api/qr-settings (public)
router.get("/qr-settings", async (req, res) => {
  try {
    const settings = await ensureDefaultQrSettings();
    res.json({
      ...settings,
      enabledThemes: settings.enabledThemes as string[],
      premiumThemes: settings.premiumThemes as string[],
      updatedAt: settings.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to get QR settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/qr-settings (admin only)
router.put("/admin/qr-settings", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));
    if (!user?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

    await ensureDefaultQrSettings();
    const [existing] = await db.select().from(qrSettings);

    const { brandName, tagline, ctaText, enabledThemes, premiumThemes } = req.body;

    const [updated] = await db
      .update(qrSettings)
      .set({
        ...(brandName !== undefined && { brandName }),
        ...(tagline !== undefined && { tagline }),
        ...(ctaText !== undefined && { ctaText }),
        ...(enabledThemes !== undefined && { enabledThemes }),
        ...(premiumThemes !== undefined && { premiumThemes }),
        updatedAt: new Date(),
      })
      .where(eq(qrSettings.id, existing.id))
      .returning();

    res.json({
      ...updated,
      enabledThemes: updated.enabledThemes as string[],
      premiumThemes: updated.premiumThemes as string[],
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err, "Failed to update QR settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
