import { cert, initializeApp, getApps, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { db, pushTokensTable, vehiclesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "./logger";

let firebaseApp: App | undefined;
let messaging: Messaging | undefined;

function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;

  const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credJson) {
    logger.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled");
    return null;
  }

  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert(JSON.parse(credJson)),
      });
    } else {
      firebaseApp = getApps()[0];
    }
    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch (err) {
    logger.error(err, "Failed to initialise Firebase Admin");
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const fbMessaging = getFirebaseMessaging();
  if (!fbMessaging) return;

  const tokens = await db
    .select({ token: pushTokensTable.token })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, userId));

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);

  try {
    const response = await fbMessaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        priority: "high",
        notification: {
          channelId: "mycarqr_alerts",
          sound: "default",
          icon: "ic_notification",
        },
      },
    });

    if (response.failureCount > 0) {
      const staleTokens: string[] = [];
      response.responses.forEach((r, i) => {
        if (
          r.error &&
          (r.error.code === "messaging/registration-token-not-registered" ||
            r.error.code === "messaging/invalid-registration-token")
        ) {
          staleTokens.push(tokenStrings[i]);
        }
      });

      if (staleTokens.length > 0) {
        await db
          .delete(pushTokensTable)
          .where(
            and(
              eq(pushTokensTable.userId, userId),
              inArray(pushTokensTable.token, staleTokens),
            ),
          );
        logger.info({ userId, count: staleTokens.length }, "Removed stale FCM tokens");
      }
    }
  } catch (err) {
    logger.error(err, "Failed to send push notification");
  }
}

export async function sendPushToVehicleOwner(
  vehicleId: number,
  payload: PushPayload,
): Promise<void> {
  const [vehicle] = await db
    .select({ userId: vehiclesTable.userId })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.id, vehicleId));

  if (!vehicle) return;

  await sendPushToUser(vehicle.userId, payload);
}
