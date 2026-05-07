import { useState } from "react";
import { useGetPaymentSettings, useGetMyPaymentRequests, useSubmitPaymentRequest } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle, Clock, XCircle, Upload, Copy, Star, Zap } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-400"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
}

export default function Payment() {
  const { data: me } = useGetMe();
  const { data: settings, isLoading: settingsLoading } = useGetPaymentSettings();
  const { data: requests = [], isLoading: requestsLoading } = useGetMyPaymentRequests();
  const submit = useSubmitPaymentRequest();
  const { toast } = useToast();

  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const amount = plan === "monthly" ? (settings?.monthlyPrice ?? 99) : (settings?.yearlyPrice ?? 599);
  const hasPending = requests.some(r => r.status === "pending");
  const isPremium = me?.plan === "premium";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function copyUpi() {
    if (settings?.upiId) {
      navigator.clipboard.writeText(settings.upiId).then(() =>
        toast({ title: "Copied!", description: "UPI ID copied to clipboard" })
      );
    }
  }

  async function handleSubmit() {
    try {
      await submit.mutateAsync({
        data: { planType: plan, amount, screenshotBase64: screenshot ?? undefined },
      });
      toast({ title: "Payment submitted!", description: "Admin will review within 24 hours." });
      queryClient.invalidateQueries({ queryKey: ["getMyPaymentRequests"] });
      queryClient.invalidateQueries({ queryKey: ["getMe"] });
      setScreenshot(null);
      setFileName("");
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Failed to submit. Try again.";
      console.error("[Payment] submit failed:", err);
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Upgrade to Premium
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Pay via UPI and get instant premium access</p>
        </div>

        {isPremium && (
          <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">You're already Premium!</p>
                {me?.premiumExpiresAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Expires {new Date(me.premiumExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={plan} onValueChange={(v) => setPlan(v as "monthly" | "yearly")}>
          <TabsList className="w-full">
            <TabsTrigger value="monthly" className="flex-1 gap-2"><Zap className="w-4 h-4" />Monthly ₹{settings?.monthlyPrice ?? 99}</TabsTrigger>
            <TabsTrigger value="yearly" className="flex-1 gap-2"><Star className="w-4 h-4" />Yearly ₹{settings?.yearlyPrice ?? 599} <Badge variant="secondary" className="text-xs ml-1">Best Value</Badge></TabsTrigger>
          </TabsList>

          {["monthly", "yearly"].map(t => (
            <TabsContent key={t} value={t}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t === "monthly" ? `Monthly Plan — ₹${settings?.monthlyPrice ?? 99}/month` : `Yearly Plan — ₹${settings?.yearlyPrice ?? 599}/year`}
                  </CardTitle>
                  <CardDescription>
                    {t === "yearly"
                      ? `Save ₹${((settings?.monthlyPrice ?? 99) * 12) - (settings?.yearlyPrice ?? 599)} vs monthly. Billed once yearly.`
                      : "Cancel anytime. Billed monthly."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {["Unlimited vehicles", "QR Studio customisation", "Premium scan alerts", "SOS emergency profile", "Accident reports", "Document management"].map(f => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{f}</div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Payment instructions */}
        {settingsLoading ? <Skeleton className="h-48 rounded-xl" /> : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How to Pay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.instructions && (
                <p className="text-sm text-muted-foreground">{settings.instructions}</p>
              )}

              {settings?.upiId && (
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <span className="text-sm font-mono flex-1 select-all">{settings.upiId}</span>
                  <Button size="icon" variant="ghost" onClick={copyUpi} className="h-7 w-7">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {settings?.qrImageBase64 && (
                <div className="flex justify-center">
                  <img
                    src={settings.qrImageBase64}
                    alt="UPI QR Code"
                    className="w-44 h-44 rounded-xl border object-contain bg-white p-2"
                  />
                </div>
              )}

              {!settings?.upiId && !settings?.qrImageBase64 && (
                <p className="text-sm text-amber-600">Payment details not yet configured. Contact admin.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Screenshot upload + submit */}
        {!isPremium && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Submit Payment Proof</CardTitle>
              <CardDescription>Upload screenshot after paying ₹{amount} ({plan})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {fileName ? fileName : "Click to upload payment screenshot (optional)"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>

              {screenshot && (
                <img src={screenshot} alt="Payment proof" className="w-full max-h-48 object-contain rounded-xl border" />
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submit.isPending || hasPending}
              >
                {hasPending
                  ? "Payment Already Submitted — Awaiting Review"
                  : submit.isPending
                    ? "Submitting…"
                    : `Submit Payment — ₹${amount} (${plan})`}
              </Button>

              {hasPending && (
                <p className="text-xs text-amber-600 text-center">
                  You have a pending payment request. Admin will review it within 24 hours.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Request history */}
        {!requestsLoading && requests.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium capitalize">{r.planType} Plan — ₹{r.amount}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                    {r.adminNote && <p className="text-xs text-muted-foreground mt-0.5">Note: {r.adminNote}</p>}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
