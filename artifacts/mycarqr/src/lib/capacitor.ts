import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { initPushNotifications } from "./pushNotifications";
import { initBilling } from "./billing";

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

let initialized = false;

export async function initCapacitor(
  navigate: (path: string) => void,
): Promise<(() => void) | undefined> {
  if (!isNativePlatform()) return undefined;
  if (initialized) return undefined;
  initialized = true;

  await SplashScreen.hide();

  const backHandle = await CapApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  });

  const urlHandle = await CapApp.addListener("appUrlOpen", ({ url }) => {
    try {
      const parsed = new URL(url);

      if (parsed.hostname === "mycarqr.replit.app") {
        const path = parsed.pathname;
        if (path.startsWith("/scan/")) {
          navigate(path);
        }
        return;
      }

      if (parsed.protocol === "mycarqr:") {
        const qrCode = parsed.pathname.replace(/^\/+/, "");
        if (qrCode) {
          navigate(`/scan/${encodeURIComponent(qrCode)}`);
        }
        return;
      }
    } catch {
      // ignore malformed URLs
    }
  });

  const pushCleanup = await initPushNotifications(navigate);

  initBilling().catch((err) =>
    console.warn("Billing init failed (non-fatal):", err),
  );

  return () => {
    backHandle.remove();
    urlHandle.remove();
    pushCleanup?.();
    initialized = false;
  };
}
