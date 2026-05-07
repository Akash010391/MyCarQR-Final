import { Capacitor } from "@capacitor/core";

const PRODUCT_ID = "premium_monthly";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type BillingState = {
  initialized: boolean;
  available: boolean;
  purchasing: boolean;
  restoring: boolean;
  product: { id: string; title: string; price: string } | null;
};

type PurchaseResolver = {
  resolve: (value: { success: boolean; error?: string }) => void;
} | null;

const state: BillingState = {
  initialized: false,
  available: false,
  purchasing: false,
  restoring: false,
  product: null,
};

let storeRef: any = null;
let pendingPurchase: PurchaseResolver = null;

function getStore(): any {
  if (storeRef) return storeRef;
  try {
    const CdvPurchase = (window as any).CdvPurchase;
    if (CdvPurchase?.store) {
      storeRef = CdvPurchase.store;
      return storeRef;
    }
  } catch {}
  return null;
}

export function getBillingState(): BillingState {
  return { ...state };
}

export function isBillingAvailable(): boolean {
  return Capacitor.isNativePlatform() && state.initialized && state.available;
}

export async function initBilling(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (state.initialized) return;

  const store = getStore();
  if (!store) {
    console.warn("CdvPurchase.store not available — billing plugin not loaded");
    return;
  }

  const CdvPurchase = (window as any).CdvPurchase;

  store.register([
    {
      id: PRODUCT_ID,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: CdvPurchase.Platform.GOOGLE_PLAY,
    },
  ]);

  store.when()
    .productUpdated(() => {
      const p = store.get(PRODUCT_ID);
      if (p) {
        state.product = {
          id: p.id,
          title: p.title || "Premium Monthly",
          price: p.pricing?.price || "₹99/month",
        };
      }
    })
    .approved(async (transaction: any) => {
      try {
        const receipt = transaction.parentReceipt;
        const purchaseToken =
          transaction.purchaseId ||
          receipt?.nativePurchase?.purchaseToken ||
          transaction.transactionId ||
          "";

        await verifyPurchaseOnServer(purchaseToken, PRODUCT_ID);
        transaction.finish();

        if (pendingPurchase) {
          pendingPurchase.resolve({ success: true });
          pendingPurchase = null;
        }
      } catch (err: any) {
        console.error("Failed to verify purchase on server:", err);
        if (pendingPurchase) {
          pendingPurchase.resolve({
            success: false,
            error: err?.message || "Server verification failed",
          });
          pendingPurchase = null;
        }
      }
    })
    .finished(() => {
      state.purchasing = false;
      state.restoring = false;
    });

  try {
    await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    state.initialized = true;
    state.available = true;

    const p = store.get(PRODUCT_ID);
    if (p) {
      state.product = {
        id: p.id,
        title: p.title || "Premium Monthly",
        price: p.pricing?.price || "₹99/month",
      };
    }
  } catch (err) {
    console.error("Failed to initialize billing:", err);
    state.initialized = true;
    state.available = false;
  }
}

export async function purchasePremium(): Promise<{ success: boolean; error?: string }> {
  const store = getStore();
  if (!store) {
    return { success: false, error: "Billing not available" };
  }

  const product = store.get(PRODUCT_ID);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const offer = product.getOffer();
  if (!offer) {
    return { success: false, error: "No offer available" };
  }

  state.purchasing = true;

  try {
    const verificationPromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
      pendingPurchase = { resolve };

      setTimeout(() => {
        if (pendingPurchase) {
          pendingPurchase = null;
          resolve({ success: false, error: "Purchase verification timed out" });
        }
      }, 120_000);
    });

    const orderResult = await offer.order();
    if (orderResult && orderResult.isError) {
      state.purchasing = false;
      pendingPurchase = null;
      if (orderResult.code === (window as any).CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED) {
        return { success: false, error: "cancelled" };
      }
      return { success: false, error: orderResult.message || "Purchase failed" };
    }

    const result = await verificationPromise;
    state.purchasing = false;
    return result;
  } catch (err: any) {
    state.purchasing = false;
    pendingPurchase = null;
    return { success: false, error: err?.message || "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  const store = getStore();
  if (!store) {
    return { success: false, error: "Billing not available" };
  }

  state.restoring = true;

  try {
    const restorePromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
      pendingPurchase = { resolve };

      setTimeout(() => {
        if (pendingPurchase) {
          pendingPurchase = null;
          resolve({ success: true });
        }
      }, 15_000);
    });

    await store.restorePurchases();
    const result = await restorePromise;
    state.restoring = false;
    return result;
  } catch (err: any) {
    state.restoring = false;
    pendingPurchase = null;
    return { success: false, error: err?.message || "Restore failed" };
  }
}

async function verifyPurchaseOnServer(
  purchaseToken: string,
  productId: string,
): Promise<void> {
  const resp = await fetch(`${basePath}/api/verify-purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ purchaseToken, productId }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Verification failed");
  }
}
