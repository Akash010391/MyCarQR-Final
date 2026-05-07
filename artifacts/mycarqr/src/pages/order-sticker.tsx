import { useState } from "react";
import { useCreateStickerOrder, useGetPaymentSettings, useGetVehicles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Upload, CheckCircle, Truck, ShoppingCart, ArrowRight, Smartphone, Copy } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { STICKER_DESIGNS, type StickerDesign } from "@/lib/sticker-pdf";
import { launchUpiPayment } from "@/lib/upiPayment";
import { isNativePlatform } from "@/lib/capacitor";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRODUCTS = [
  {
    id: "basic_vinyl",
    name: "Basic Vinyl Sticker",
    price: 99,
    description: "Durable vinyl sticker · 8×8 cm · Outdoor rated",
    badge: null,
  },
  {
    id: "premium_weatherproof",
    name: "Premium Weatherproof",
    price: 149,
    description: "UV-resistant laminate · Extra-strong adhesive · 8×8 cm",
    badge: "Popular",
  },
  {
    id: "pack_of_3",
    name: "Pack of 3 Stickers",
    price: 249,
    description: "3× premium stickers · Great value · Mix designs",
    badge: "Best Value",
  },
] as const;

type ProductId = typeof PRODUCTS[number]["id"];

type Step = "product" | "address" | "payment" | "done";

export default function OrderSticker() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: vehicles = [] } = useGetVehicles();
  const { data: settings } = useGetPaymentSettings();
  const createOrder = useCreateStickerOrder();

  const [step, setStep] = useState<Step>("product");
  const [selectedProduct, setSelectedProduct] = useState<ProductId>("premium_weatherproof");
  const [selectedStyle, setSelectedStyle] = useState<StickerDesign>("midnight-carbon");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [orderCode, setOrderCode] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const product = PRODUCTS.find(p => p.id === selectedProduct)!;

  function handleField(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setScreenshot(base64);
      if (orderId) {
        setUploading(true);
        try {
          const resp = await fetch(`${basePath}/api/sticker-orders/${orderId}/screenshot`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ screenshotBase64: base64 }),
            credentials: "include",
          });
          if (!resp.ok) throw new Error("Upload failed");
          toast({ title: "Screenshot uploaded!", description: "This will help verify your payment faster." });
        } catch {
          toast({ title: "Upload failed", description: "You can try again from My Orders.", variant: "destructive" });
        } finally {
          setUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  }

  function copyUpi() {
    if (settings?.upiId) {
      navigator.clipboard.writeText(settings.upiId).then(() =>
        toast({ title: "Copied!", description: "UPI ID copied to clipboard" })
      );
    }
  }

  async function placeOrder() {
    const vehicle = selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) : null;
    try {
      const order = await createOrder.mutateAsync({
        data: {
          ...form,
          product: selectedProduct,
          amount: product.price,
          stickerStyle: selectedStyle,
          vehicleId: selectedVehicleId ?? undefined,
          vehicleQrCode: vehicle?.qrCode ?? undefined,
          vehicleNumber: vehicle?.vehicleNumber ?? undefined,
        },
      });
      setOrderId(order.id);
      setOrderCode(order.orderCode);
      queryClient.invalidateQueries({ queryKey: ["getMyStickerOrders"] });
      setStep("payment");
    } catch (err: any) {
      const msg =
        err?.data?.error ??
        err?.message ??
        "Failed to place order. Please try again.";
      console.error("[OrderSticker] placeOrder failed:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  function handlePayNow() {
    if (!settings?.upiId || !orderCode) return;

    const launched = launchUpiPayment({
      upiId: settings.upiId,
      payeeName: "MyCarQR",
      amount: product.price,
      transactionRef: orderCode,
      note: `MyCarQR Sticker Order #${orderCode}`,
    });

    if (launched) {
      toast({
        title: "UPI app opened",
        description: "Complete the payment in your UPI app, then come back and tap 'I've Paid'.",
      });
    } else {
      toast({
        title: "UPI apps are only available on Android",
        description: "Please use the UPI ID or QR code shown below to pay manually.",
      });
    }
  }

  const addressValid =
    form.customerName && form.phone && form.addressLine1 && form.city && form.state && form.pincode;

  if (step === "product") {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Order Physical Sticker
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Get a professional QR sticker delivered to your door
          </p>
        </div>

        <div className="space-y-3">
          {PRODUCTS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p.id)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                selectedProduct === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{p.name}</span>
                    {p.badge && (
                      <Badge variant="secondary" className="text-xs">{p.badge}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-primary">₹{p.price}</span>
                </div>
              </div>
              {selectedProduct === p.id && (
                <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Selected
                </div>
              )}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Choose Sticker Style
            </CardTitle>
            <CardDescription className="text-xs">
              Pick the design we'll print and ship to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {STICKER_DESIGNS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedStyle(d.id)}
                  type="button"
                  className={`relative rounded-xl border-2 overflow-hidden text-left transition-all active:scale-95 ${
                    selectedStyle === d.id
                      ? "border-primary shadow-md ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ borderColor: selectedStyle === d.id ? d.accentColor : undefined }}
                >
                  <div
                    className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden"
                    style={{ background: d.bgColor }}
                  >
                    <img
                      src={d.previewUrl}
                      alt={d.name}
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover [image-rendering:auto]"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="px-2 py-1.5" style={{ background: d.bgColor }}>
                    <p className="text-[11px] font-bold leading-tight" style={{ color: d.textColor }}>
                      {d.name}
                    </p>
                    <p className="text-[9px] leading-tight opacity-70" style={{ color: d.textColor }}>
                      {d.description}
                    </p>
                  </div>
                  {selectedStyle === d.id && (
                    <div
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {vehicles.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Link to a Vehicle (optional)</CardTitle>
              <CardDescription className="text-xs">
                Helps pre-fill the QR code for your sticker
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                value={selectedVehicleId ?? ""}
                onChange={e => setSelectedVehicleId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">— No vehicle (I'll provide QR code manually) —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} · {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        <Button className="w-full gap-2" onClick={() => setStep("address")}>
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (step === "address") {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Delivery Address
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {product.name} · ₹{product.price}
          </p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="Rahul Sharma"
                  value={form.customerName}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  placeholder="Flat 4B, Sunshine Apartments"
                  value={form.addressLine1}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  placeholder="Near Post Office, MG Road"
                  value={form.addressLine2}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  placeholder="400001"
                  value={form.pincode}
                  onChange={handleField}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setStep("product")}>
            Back
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!addressValid || createOrder.isPending}
            onClick={placeOrder}
          >
            {createOrder.isPending ? "Placing Order…" : <>Pay ₹{product.price} <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Complete Payment
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Order {orderCode} · {product.name} · ₹{product.price}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              {isNativePlatform() ? "Pay via UPI App" : "Pay via UPI"}
            </CardTitle>
            <CardDescription>
              {isNativePlatform()
                ? `Tap the button below to open your UPI app and pay ₹${product.price}`
                : `Order created! Pay ₹${product.price} using the UPI ID or QR code below.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNativePlatform() && (
              <>
                <Button
                  className="w-full h-14 text-lg gap-2"
                  onClick={handlePayNow}
                  disabled={!settings?.upiId}
                >
                  <Smartphone className="w-5 h-5" />
                  Pay Now — ₹{product.price}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or pay manually</span>
                  </div>
                </div>
              </>
            )}

            {!isNativePlatform() && (
              <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 p-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Order Created — Pay using UPI ID or QR below
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Open any UPI app (Google Pay, PhonePe, Paytm) on your phone and pay to the UPI ID below. Then tap "I've Completed Payment".
                </p>
              </div>
            )}

            {settings?.upiId && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">UPI ID:</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <span className="text-sm font-mono flex-1 select-all">{settings.upiId}</span>
                  <Button size="icon" variant="ghost" onClick={copyUpi} className="h-7 w-7">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {settings?.qrImageBase64 && (
              <div className="flex justify-center">
                <img
                  src={settings.qrImageBase64}
                  alt="UPI QR"
                  className="w-44 h-44 rounded-xl border object-contain bg-white p-2"
                />
              </div>
            )}

            {!settings?.upiId && !settings?.qrImageBase64 && (
              <p className="text-sm text-amber-600">Payment details not yet configured. Contact admin.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload Payment Screenshot (Optional)</CardTitle>
            <CardDescription>Helps speed up payment verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : fileName ? fileName : "Click to upload payment screenshot"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            {screenshot && (
              <img src={screenshot} alt="Payment proof" className="w-full max-h-48 object-contain rounded-xl border" />
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base gap-2"
          onClick={() => setStep("done")}
        >
          <CheckCircle className="w-5 h-5" />
          I've Completed Payment
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-300">Payment Submitted!</h2>
            <p className="text-green-700 dark:text-green-400 text-sm mt-1">
              We'll verify your payment and ship your sticker within 3–5 business days.
            </p>
          </div>
          <div className="bg-white dark:bg-green-900/30 rounded-lg px-4 py-2 border">
            <p className="text-xs text-muted-foreground">Order Reference</p>
            <p className="text-lg font-mono font-bold text-green-700 dark:text-green-300">{orderCode}</p>
          </div>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setLocation("/my-orders")}
            >
              Track My Orders
            </Button>
            <Button className="flex-1" onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
