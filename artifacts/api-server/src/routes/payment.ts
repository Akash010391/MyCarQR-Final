import { Router } from "express";
import { db, paymentSettingsTable, paymentRequestsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { validateScreenshot } from "../lib/imageValidation";

const router = Router();

async function ensureDefaultSettings() {
  const [existing] = await db.select().from(paymentSettingsTable);
  if (!existing) {
    await db.insert(paymentSettingsTable).values({
      upiId: "",
      qrImageBase64: "",
      monthlyPrice: 99,
      yearlyPrice: 599,
      instructions: "Pay via UPI and upload a screenshot of the payment confirmation. Your account will be upgraded within 24 hours after admin approval.",
      updatedAt: new Date(),
    });
  }
}

// GET /api/payment-settings (public)
router.get("/payment-settings", async (req, res) => {
  try {
    await ensureDefaultSettings();
    const [settings] = await db.select().from(paymentSettingsTable);
    res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "Failed to get payment settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payment-requests (own requests)
router.get("/payment-requests", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  try {
    const requests = await db
      .select()
      .from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.userId, userId))
      .orderBy(desc(paymentRequestsTable.createdAt));

    res.json(requests.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error(err, "Failed to get payment requests");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payment-requests (submit new request)
router.post("/payment-requests", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const auth = getAuth(req);
  const email = auth?.sessionClaims?.email as string | undefined;
  const { planType = "monthly", amount, screenshotBase64 } = req.body;

  if (!amount || !["monthly", "yearly"].includes(planType)) {
    res.status(400).json({ error: "planType and amount are required" });
    return;
  }
  if (screenshotBase64) {
    const imgErr = validateScreenshot(screenshotBase64);
    if (imgErr) { res.status(400).json({ error: imgErr }); return; }
  }

  try {
    // Check if there's already a pending request
    const existing = await db
      .select()
      .from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.userId, userId));

    const pending = existing.filter(r => r.status === "pending");
    if (pending.length > 0) {
      res.status(409).json({ error: "You already have a pending payment request. Please wait for admin review." });
      return;
    }

    const [request] = await db
      .insert(paymentRequestsTable)
      .values({
        userId,
        email: email || null,
        status: "pending",
        planType,
        amount,
        screenshotBase64: screenshotBase64 || null,
        adminNote: null,
      })
      .returning();

    res.status(201).json({
      ...request,
      createdAt: request.createdAt.toISOString(),
      reviewedAt: null,
      expiresAt: null,
    });
  } catch (err) {
    req.log.error(err, "Failed to submit payment request");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
