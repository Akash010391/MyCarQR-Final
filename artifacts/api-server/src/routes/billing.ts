import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

const VALID_PRODUCTS: Record<string, number> = {
  premium_monthly: 30,
};

async function verifyWithGooglePlay(
  purchaseToken: string,
  productId: string,
): Promise<{ valid: boolean; expiryTimeMillis?: string }> {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    logger.error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured — cannot verify purchase");
    return { valid: false };
  }

  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.mycarqr.app";

  try {
    const { google } = await import("googleapis");
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidPublisher = google.androidpublisher({ version: "v3", auth });

    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    const data = response.data;
    const paymentState = data.paymentState;
    const expiryTimeMillis = data.expiryTimeMillis;

    if (paymentState === 1 || paymentState === 2) {
      return { valid: true, expiryTimeMillis: expiryTimeMillis ?? undefined };
    }

    return { valid: false };
  } catch (err) {
    logger.error(err, "Google Play verification failed");
    return { valid: false };
  }
}

router.post("/verify-purchase", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const { purchaseToken, productId } = req.body;

  if (!purchaseToken || !productId) {
    res.status(400).json({ error: "purchaseToken and productId are required" });
    return;
  }

  const durationDays = VALID_PRODUCTS[productId];
  if (!durationDays) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    res.status(503).json({ error: "Purchase verification is not configured" });
    return;
  }

  try {
    const verification = await verifyWithGooglePlay(purchaseToken, productId);
    if (!verification.valid) {
      res.status(403).json({ error: "Purchase verification failed" });
      return;
    }

    let premiumExpiresAt: Date;
    if (verification.expiryTimeMillis) {
      premiumExpiresAt = new Date(parseInt(verification.expiryTimeMillis));
    } else {
      premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }

    const [user] = await db
      .update(usersTable)
      .set({
        plan: "premium",
        premiumExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.userId, userId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    req.log.info({ userId, productId }, "Premium activated via Google Play");

    res.json({
      success: true,
      plan: "premium",
      premiumExpiresAt: premiumExpiresAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to verify purchase");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
