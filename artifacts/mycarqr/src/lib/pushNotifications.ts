import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let listenersAttached = false;
let pendingToken: string | null = null;

export async function initPushNotifications(
  navigate: (path: string) => void,
): Promise<(() => void) | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined;
  if (listenersAttached) return undefined;

  let permResult = await PushNotifications.checkPermissions();
  if (permResult.receive === "prompt") {
    permResult = await PushNotifications.requestPermissions();
  }

  if (permResult.receive !== "granted") {
    console.warn("Push notification permission not granted");
    return undefined;
  }

  await PushNotifications.register();
  listenersAttached = true;

  const registrationListener = await PushNotifications.addListener(
    "registration",
    (token) => {
      console.log("FCM token received");
      pendingToken = token.value;
    },
  );

  const registrationErrorListener = await PushNotifications.addListener(
    "registrationError",
    (error) => {
      console.error("Push registration error:", error);
    },
  );

  const foregroundListener = await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      console.log("Foreground push received:", notification);
    },
  );

  const tapListener = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const data = action.notification.data;
      if (data?.route) {
        navigate(data.route);
      } else if (data?.type === "scan_alert" || data?.type === "alert") {
        navigate("/alerts");
      } else if (data?.type === "accident_report") {
        navigate("/accident-reports");
      } else if (data?.type === "lost_item") {
        navigate("/lost-items");
      } else if (data?.type === "document_expiry") {
        navigate("/documents");
      } else {
        navigate("/dashboard");
      }
    },
  );

  return () => {
    registrationListener.remove();
    registrationErrorListener.remove();
    foregroundListener.remove();
    tapListener.remove();
    listenersAttached = false;
    pendingToken = null;
  };
}

export function getPendingPushToken(): string | null {
  return pendingToken;
}

export function clearPendingPushToken(): void {
  pendingToken = null;
}
