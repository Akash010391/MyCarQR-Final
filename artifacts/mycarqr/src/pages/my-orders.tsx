import { useState } from "react";
import { useGetMyStickerOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Truck, CheckCircle, Clock, XCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { STICKER_DESIGNS } from "@/lib/sticker-pdf";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const STYLE_BY_ID = Object.fromEntries(STICKER_DESIGNS.map(d => [d.id, d]));

function paymentBadge(status: string) {
  if (status === "approved") return <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Payment Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Payment Rejected</Badge>;
  if (status === "screenshot_uploaded") return <Badge variant="outline" className="text-xs text-amber-600 border-amber-400"><Clock className="w-3 h-3 mr-1" />Screenshot Uploaded</Badge>;
  if (status === "pending_verification") return <Badge variant="outline" className="text-xs text-amber-600 border-amber-400"><Clock className="w-3 h-3 mr-1" />Pending Verification</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Awaiting Payment</Badge>;
}

function orderBadge(status: string) {
  if (status === "delivered") return <Badge className="bg-green-500 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
  if (status === "shipped") return <Badge className="bg-blue-500 text-white text-xs"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
  if (status === "printed") return <Badge variant="secondary" className="text-xs">Printed</Badge>;
  if (status === "cancelled") return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
}

const PRODUCT_NAMES: Record<string, string> = {
  basic_vinyl: "Basic Vinyl Sticker",
  premium_weatherproof: "Premium Weatherproof",
  pack_of_3: "Pack of 3 Stickers",
};

export default function MyOrders() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetMyStickerOrders();
  const { toast } = useToast();
  const orders = data?.orders ?? [];

  async function uploadScreenshot(orderId: number, screenshotBase64: string) {
    try {
      const resp = await fetch(`${basePath}/api/sticker-orders/${orderId}/screenshot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotBase64 }),
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Upload failed");
      toast({ title: "Screenshot uploaded!", description: "Admin will verify your payment soon." });
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    }
  }

  function handleFile(orderId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => uploadScreenshot(orderId, ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            My Sticker Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your physical sticker orders</p>
        </div>
        <Button size="sm" onClick={() => setLocation("/order-sticker")}>
          New Order
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">No sticker orders yet.</p>
            <Button onClick={() => setLocation("/order-sticker")}>Order Now</Button>
          </CardContent>
        </Card>
      )}

      {orders.map(order => (
        <Card key={order.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {PRODUCT_NAMES[order.product] ?? order.product}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.orderCode} · ₹{order.amount} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {order.vehicleNumber && (
                  <p className="text-xs font-semibold text-primary mt-0.5">
                    For vehicle: {order.vehicleNumber}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end">
                {paymentBadge(order.paymentStatus)}
                {orderBadge(order.orderStatus)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.stickerStyle && STYLE_BY_ID[order.stickerStyle] && (
              <div
                className="flex items-center gap-3 rounded-lg border-2 p-2"
                style={{ borderColor: STYLE_BY_ID[order.stickerStyle]!.accentColor + "55" }}
              >
                <div
                  className="w-12 h-12 rounded overflow-hidden shrink-0"
                  style={{ background: STYLE_BY_ID[order.stickerStyle]!.bgColor }}
                >
                  <img
                    src={STYLE_BY_ID[order.stickerStyle]!.thumbnailUrl}
                    alt={STYLE_BY_ID[order.stickerStyle]!.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover [image-rendering:auto]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold">Sticker Style</p>
                  <p className="text-sm font-bold" style={{ color: STYLE_BY_ID[order.stickerStyle]!.accentColor }}>
                    {STYLE_BY_ID[order.stickerStyle]!.name}
                  </p>
                </div>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              <p>{order.customerName}</p>
              <p>{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ""}</p>
              <p>{order.city}, {order.state} — {order.pincode}</p>
              <p>{order.phone}</p>
            </div>

            {order.trackingNumber && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Tracking Number</p>
                  <p className="text-sm font-mono">{order.trackingNumber}</p>
                </div>
              </div>
            )}

            {order.adminNote && (
              <p className="text-xs text-muted-foreground border-l-2 pl-3">Admin note: {order.adminNote}</p>
            )}

            {(order.paymentStatus === "pending" || order.paymentStatus === "pending_verification") && (
              <label className="flex items-center gap-2 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:border-primary transition-colors w-full">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload payment screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFile(order.id, e)}
                />
              </label>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
