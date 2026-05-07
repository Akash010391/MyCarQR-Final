import { isNativePlatform } from "./capacitor";

export interface UpiPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionRef: string;
  note: string;
}

export function buildUpiUrl(params: UpiPaymentParams): string {
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    tr: params.transactionRef,
    tn: params.note,
    cu: "INR",
  });
  return `upi://pay?${query.toString()}`;
}

export function launchUpiPayment(params: UpiPaymentParams): boolean {
  const url = buildUpiUrl(params);

  if (isNativePlatform()) {
    window.open(url, "_system");
    return true;
  }

  return false;
}
