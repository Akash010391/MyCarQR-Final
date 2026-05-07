import { useState, useRef } from "react";
import {
  useGetAdminStats, useGetAdminUsers, useGetAdminAlerts, useGetAdminVehicles,
  useGetAdminPaymentRequests, useApprovePaymentRequest, useRejectPaymentRequest,
  useGetPaymentSettings, useUpdatePaymentSettings, useAdminUpgradeUser,
  useGetQrSettings, useUpdateQrSettings,
  useGetAdminAccidentReports, useGetAdminLostItems,
  useMarkAdminAccidentReportRead, useMarkAdminLostItemRead,
  useGetAdminStickerOrders, useUpdateStickerOrder,
  useGetMe,
  type AccidentReport, type LostItem,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { STICKER_DESIGNS, generateStickerPDF, type StickerDesign } from "@/lib/sticker-pdf";
import ContactMessagesTab from "@/components/admin/contact-messages-tab";
import LegalEditorTab from "@/components/admin/legal-editor-tab";
import FaqsTab from "@/components/admin/faqs-tab";
import TestimonialsTab from "@/components/admin/testimonials-tab";
import SupportTicketsTab from "@/components/admin/support-tickets-tab";
import { resolvePhotoSrc } from "@/lib/photoUrl";
import {
  Shield, Users, Car, Bell, TrendingUp, CreditCard, CheckCircle, XCircle,
  Clock, Upload, Save, AlertTriangle, KeyRound, RefreshCw, ChevronDown, QrCode, Package, Truck
} from "lucide-react";
function StatCard({ label, value, sub, icon: Icon, color = "text-primary" }: {
  label: string; value: string | number; sub: string; icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return plan === "premium"
    ? <Badge className="bg-amber-500 text-white text-[10px]">Premium</Badge>
    : <Badge variant="outline" className="text-[10px]">Free</Badge>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500 text-white text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-[10px]"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats, isLoading, refetch } = useGetAdminStats();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Platform Overview</h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers ?? 0} sub={`${stats?.premiumUsers ?? 0} premium`} icon={Users} />
          <StatCard label="Vehicles" value={stats?.totalVehicles ?? 0} sub="Registered" icon={Car} />
          <StatCard label="Alerts Today" value={stats?.alertsToday ?? 0} sub={`${stats?.totalAlerts ?? 0} total`} icon={Bell} />
          <StatCard label="Pending Payments" value={stats?.pendingPayments ?? 0} sub="Awaiting review" icon={CreditCard} color="text-amber-500" />
          <StatCard label="Accidents" value={stats?.accidentReports ?? 0} sub="Total reports" icon={AlertTriangle} color="text-red-500" />
          <StatCard label="Lost Items" value={stats?.lostItemReports ?? 0} sub="Total reports" icon={KeyRound} color="text-blue-500" />
        </div>
      )}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold">Conversion Rate</p>
              <p className="text-xs text-muted-foreground">Free → Premium</p>
            </div>
            <p className="text-3xl font-bold text-primary">
              {stats?.totalUsers
                ? `${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const { data, isLoading } = useGetAdminUsers({ limit: 50 });
  const upgrade = useAdminUpgradeUser();
  const { toast } = useToast();
  const users = data?.users ?? [];

  async function togglePlan(userId: string, currentPlan: string) {
    const newPlan = currentPlan === "premium" ? "free" : "premium";
    try {
      await upgrade.mutateAsync({ userId, data: { plan: newPlan, durationDays: 30 } });
      toast({ title: `User ${newPlan === "premium" ? "upgraded" : "downgraded"}` });
      queryClient.invalidateQueries({ queryKey: ["getAdminUsers"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{data?.total ?? 0} total users</p>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.userId}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.email || u.userId}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <PlanBadge plan={u.plan} />
                    <span className="text-[10px] text-muted-foreground">{u.vehicleCount} vehicles</span>
                    {u.isAdmin && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                    {u.premiumExpiresAt && (
                      <span className="text-[10px] text-muted-foreground">
                        Expires {new Date(u.premiumExpiresAt).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={u.plan === "premium" ? "outline" : "default"}
                  className="text-xs shrink-0"
                  onClick={() => togglePlan(u.userId, u.plan)}
                  disabled={upgrade.isPending}
                >
                  {u.plan === "premium" ? "Downgrade" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vehicles Tab ──────────────────────────────────────────────────────────────
function VehiclesTab() {
  const { data, isLoading } = useGetAdminVehicles({ limit: 50 });
  const vehicles = data?.vehicles ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{data?.total ?? 0} total vehicles</p>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No vehicles found</p>
      ) : (
        <div className="space-y-2">
          {vehicles.map(v => (
            <Card key={v.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{v.vehicleNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[v.brand, v.model].filter(Boolean).join(" ")} · {v.email || v.userId}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PlanBadge plan={v.plan ?? "free"} />
                  <Badge variant={v.qrActive ? "default" : "outline"} className="text-[10px]">
                    {v.qrActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Payment Requests Tab ──────────────────────────────────────────────────────
function PaymentRequestsTab() {
  const { data: allRequests = [], isLoading } = useGetAdminPaymentRequests({});
  const approve = useApprovePaymentRequest();
  const reject = useRejectPaymentRequest();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [rejectNote, setRejectNote] = useState("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const requests = filter === "all" ? allRequests : allRequests.filter(r => r.status === filter);

  async function handleApprove(id: number) {
    try {
      await approve.mutateAsync({ requestId: id, data: {} });
      toast({ title: "Payment approved!", description: "User has been upgraded to premium." });
      queryClient.invalidateQueries({ queryKey: ["getAdminPaymentRequests"] });
      queryClient.invalidateQueries({ queryKey: ["getAdminStats"] });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  }

  async function handleReject() {
    if (!rejectNote.trim() || !rejectDialog.id) return;
    try {
      await reject.mutateAsync({ requestId: rejectDialog.id, data: { adminNote: rejectNote } });
      toast({ title: "Payment rejected" });
      queryClient.invalidateQueries({ queryKey: ["getAdminPaymentRequests"] });
      setRejectDialog({ open: false, id: null });
      setRejectNote("");
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(["pending", "all", "approved", "rejected"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-xs capitalize"
            onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No {filter} requests</p>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className={r.status === "pending" ? "border-amber-300" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.email || r.userId}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.planType} · ₹{r.amount} · {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </p>
                    {r.adminNote && <p className="text-xs text-muted-foreground mt-0.5">Note: {r.adminNote}</p>}
                    {r.expiresAt && r.status === "approved" && (
                      <p className="text-xs text-green-600 mt-0.5">Premium until {new Date(r.expiresAt).toLocaleDateString("en-IN")}</p>
                    )}
                  </div>
                  <PaymentStatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.screenshotBase64 && (
                    <Button size="sm" variant="outline" className="text-xs gap-1"
                      onClick={() => setPreviewImg(r.screenshotBase64 ?? null)}>
                      View Screenshot
                    </Button>
                  )}
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                        onClick={() => handleApprove(r.id)} disabled={approve.isPending}>
                        <CheckCircle className="w-3.5 h-3.5" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="text-xs gap-1"
                        onClick={() => { setRejectDialog({ open: true, id: r.id }); setRejectNote(""); }}>
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Reject Payment Request</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason for rejection</Label>
            <Textarea placeholder="e.g. Screenshot unclear, wrong amount…" value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectNote.trim() || reject.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot preview dialog */}
      <Dialog open={!!previewImg} onOpenChange={o => !o && setPreviewImg(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Payment Screenshot</DialogTitle></DialogHeader>
          {previewImg && <img src={previewImg} alt="Payment proof" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Payment Settings Tab ─────────────────────────────────────────────────────
function PaymentSettingsTab() {
  const { data: settings, isLoading } = useGetPaymentSettings();
  const updateSettings = useUpdatePaymentSettings();
  const { toast } = useToast();

  const [upiId, setUpiId] = useState("");
  const [qrBase64, setQrBase64] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState(99);
  const [yearlyPrice, setYearlyPrice] = useState(599);
  const [instructions, setInstructions] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (settings && !loaded) {
    setUpiId(settings.upiId || "");
    setQrBase64(settings.qrImageBase64 || "");
    setMonthlyPrice(settings.monthlyPrice || 99);
    setYearlyPrice(settings.yearlyPrice || 599);
    setInstructions(settings.instructions || "");
    setLoaded(true);
  }

  function handleQrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Too large", description: "QR image max 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setQrBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    try {
      await updateSettings.mutateAsync({
        data: { upiId, qrImageBase64: qrBase64, monthlyPrice, yearlyPrice, instructions },
      });
      toast({ title: "Settings saved!" });
      queryClient.invalidateQueries({ queryKey: ["getPaymentSettings"] });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;

  return (
    <div className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label>UPI ID</Label>
        <Input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Monthly Price (₹)</Label>
        <Input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(Number(e.target.value))} />
      </div>

      <div className="space-y-2">
        <Label>Yearly Price (₹)</Label>
        <Input type="number" value={yearlyPrice} onChange={e => setYearlyPrice(Number(e.target.value))} />
      </div>

      <div className="space-y-2">
        <Label>Payment Instructions</Label>
        <Textarea rows={3} placeholder="Instructions shown to users..." value={instructions} onChange={e => setInstructions(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>UPI QR Code Image</Label>
        {qrBase64 && (
          <img src={qrBase64} alt="QR Code" className="w-36 h-36 rounded-xl border object-contain bg-white p-2 mb-2" />
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 text-sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" />Upload QR Image
          </Button>
          {qrBase64 && <Button variant="ghost" className="text-sm text-destructive" onClick={() => setQrBase64("")}>Remove</Button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleQrFile} />
      </div>

      <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
        <Save className="w-4 h-4" />
        {updateSettings.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

// ─── QR Settings Tab ──────────────────────────────────────────────────────────
const ALL_QR_THEMES = [
  { id: "minimal-white", name: "Minimal White", isPremiumDefault: false },
  { id: "classic-black-gold", name: "Classic Black & Gold", isPremiumDefault: false },
  { id: "sporty-red", name: "Sporty Red", isPremiumDefault: true },
  { id: "royal-gold", name: "Royal Gold", isPremiumDefault: true },
  { id: "neon-blue", name: "Neon Blue", isPremiumDefault: true },
  { id: "army-green", name: "Army Green", isPremiumDefault: true },
  { id: "corporate-blue", name: "Corporate Blue", isPremiumDefault: true },
  { id: "emergency-red", name: "Emergency Red", isPremiumDefault: true },
];

function QrSettingsTab() {
  const { data, isLoading } = useGetQrSettings();
  const updateQr = useUpdateQrSettings();
  const { toast } = useToast();

  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [enabledThemes, setEnabledThemes] = useState<string[]>([]);
  const [premiumThemes, setPremiumThemes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (data && !loaded) {
    setBrandName(data.brandName);
    setTagline(data.tagline);
    setCtaText(data.ctaText);
    setEnabledThemes((data.enabledThemes as string[]) ?? ALL_QR_THEMES.map(t => t.id));
    setPremiumThemes((data.premiumThemes as string[]) ?? ALL_QR_THEMES.filter(t => t.isPremiumDefault).map(t => t.id));
    setLoaded(true);
  }

  async function handleSave() {
    try {
      await updateQr.mutateAsync({ data: { brandName, tagline, ctaText, enabledThemes, premiumThemes } });
      toast({ title: "QR settings saved!" });
      queryClient.invalidateQueries({ queryKey: ["getQrSettings"] });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  function toggleThemeEnabled(id: string) {
    setEnabledThemes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  function togglePremium(id: string) {
    setPremiumThemes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><QrCode className="w-4 h-4 text-primary" />QR Sticker Branding</h3>
        <p className="text-xs text-muted-foreground mt-1">These values appear on every user's QR sticker design.</p>
      </div>

      <div className="space-y-2">
        <Label>Brand Name</Label>
        <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="MyCarQR" maxLength={20} />
      </div>

      <div className="space-y-2">
        <Label>Tagline</Label>
        <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Scan. Connect. Stay Safe." maxLength={60} />
        <p className="text-xs text-muted-foreground">Shown on all sticker designs.</p>
      </div>

      <div className="space-y-2">
        <Label>CTA Text (Call-to-Action)</Label>
        <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Scan to Connect" maxLength={30} />
        <p className="text-xs text-muted-foreground">Button/label near QR code.</p>
      </div>

      <div className="space-y-3">
        <Label>QR Theme Management</Label>
        <p className="text-xs text-muted-foreground">Enable/disable themes and set which require premium.</p>
        <div className="space-y-2">
          {ALL_QR_THEMES.map(theme => {
            const isEnabled = enabledThemes.includes(theme.id);
            const isPrem = premiumThemes.includes(theme.id);
            return (
              <div key={theme.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleThemeEnabled(theme.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">{theme.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isPrem ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                    onClick={() => togglePremium(theme.id)}
                  >
                    {isPrem ? "Premium" : "Free"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Click the badge to toggle Free/Premium. Uncheck to disable a theme entirely.</p>
      </div>

      <Button onClick={handleSave} disabled={updateQr.isPending} className="gap-2">
        <Save className="w-4 h-4" />
        {updateQr.isPending ? "Saving…" : "Save QR Settings"}
      </Button>
    </div>
  );
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────
function AlertsTab() {
  const { data, isLoading } = useGetAdminAlerts({ limit: 50 });
  const alerts = (data?.alerts ?? []) as any[];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{data?.total ?? 0} total scan alerts</p>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No alerts yet</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.vehicleNumber || `Vehicle #${a.vehicleId}`}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.message || "QR scanned"}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{new Date(a.createdAt).toLocaleDateString("en-IN")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Accident Reports Tab ─────────────────────────────────────────────────────
function formatLocation(
  locationLabel?: string,
  latitude?: string,
  longitude?: string,
): { label: string; mapsUrl: string | null } | null {
  let mapsUrl: string | null = null;
  if (latitude && longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    }
  }
  if (locationLabel && locationLabel.trim().length > 0) {
    return { label: locationLabel, mapsUrl };
  }
  if (latitude && longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, mapsUrl };
    }
    return { label: `${latitude}, ${longitude}`, mapsUrl };
  }
  return null;
}

function AccidentReportsTab() {
  const { data, isLoading } = useGetAdminAccidentReports({ limit: 50 });
  const reports: AccidentReport[] = data?.reports ?? [];
  const { toast } = useToast();
  const [hideHandled, setHideHandled] = useState(false);

  const markRead = useMarkAdminAccidentReportRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/accident-reports"] });
        toast({ title: "Marked as handled" });
      },
      onError: () => {
        toast({ title: "Failed to mark as handled", variant: "destructive" });
      },
    },
  });

  const visibleReports = hideHandled ? reports.filter(r => !r.isRead) : reports;
  const unreadCount = reports.filter(r => !r.isRead).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {data?.total ?? 0} accident reports{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <span>Hide handled</span>
          <Switch
            checked={hideHandled}
            onCheckedChange={setHideHandled}
            data-testid="switch-admin-hide-handled-accidents"
          />
        </label>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : visibleReports.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {hideHandled && reports.length > 0 ? "No unread accident reports" : "No accident reports yet"}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleReports.map((r) => {
            const location = formatLocation(r.locationLabel, r.latitude, r.longitude);
            const isUnread = !r.isRead;
            return (
              <Card
                key={r.id}
                className={isUnread ? "border-l-4 border-l-red-500 bg-red-500/5" : ""}
                data-testid={`card-admin-accident-${r.id}`}
                data-unread={isUnread ? "true" : "false"}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      {r.vehicleNumber || `Vehicle #${r.vehicleId}`}
                      {isUnread && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 h-4"
                          data-testid={`badge-admin-accident-unread-${r.id}`}
                        >
                          Unread
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground shrink-0">{new Date(r.reportedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  {r.description && (
                    <p
                      className="text-xs text-muted-foreground line-clamp-2"
                      data-testid={`text-admin-accident-description-${r.id}`}
                    >
                      {r.description}
                    </p>
                  )}
                  {location && (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`text-admin-accident-location-${r.id}`}
                    >
                      📍{" "}
                      {location.mapsUrl ? (
                        <a
                          href={location.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                          title="Open in Google Maps"
                          data-testid={`link-admin-accident-location-${r.id}`}
                        >
                          {location.label}
                        </a>
                      ) : (
                        location.label
                      )}
                    </p>
                  )}
                  {r.photos.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-1.5">
                      {r.photos
                        .filter((p) => typeof p === "string" && (p.startsWith("data:image/") || p.startsWith("/objects/")))
                        .map((photo, i) => {
                          const src = resolvePhotoSrc(photo);
                          return (
                            <a
                              key={i}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open full size in new tab"
                            >
                              <img
                                src={src}
                                alt={`accident photo ${i + 1}`}
                                className="w-14 h-14 object-cover rounded-md border hover:opacity-80 transition-opacity"
                                data-testid={`img-admin-accident-photo-${r.id}-${i}`}
                              />
                            </a>
                          );
                        })}
                    </div>
                  )}
                  <div className="flex justify-end pt-1.5">
                    {isUnread ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate({ reportId: r.id })}
                        data-testid={`button-admin-accident-mark-handled-${r.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Mark as handled
                      </Button>
                    ) : (
                      <span
                        className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
                        data-testid={`text-admin-accident-handled-${r.id}`}
                      >
                        <CheckCircle className="w-3 h-3 text-green-600" /> Handled
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Lost Items Tab ───────────────────────────────────────────────────────────
function LostItemsTab() {
  const { data, isLoading } = useGetAdminLostItems({ limit: 50 });
  const items: LostItem[] = data?.items ?? [];
  const { toast } = useToast();
  const [hideHandled, setHideHandled] = useState(false);

  const markRead = useMarkAdminLostItemRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/lost-items"] });
        toast({ title: "Marked as handled" });
      },
      onError: () => {
        toast({ title: "Failed to mark as handled", variant: "destructive" });
      },
    },
  });

  const visibleItems = hideHandled ? items.filter(i => !i.isRead) : items;
  const unreadCount = items.filter(i => !i.isRead).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {data?.total ?? 0} lost item reports{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <span>Hide handled</span>
          <Switch
            checked={hideHandled}
            onCheckedChange={setHideHandled}
            data-testid="switch-admin-hide-handled-lost"
          />
        </label>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {hideHandled && items.length > 0 ? "No unread lost item reports" : "No lost item reports yet"}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const location = formatLocation(item.locationLabel, item.latitude, item.longitude);
            const isUnread = !item.isRead;
            return (
              <Card
                key={item.id}
                className={isUnread ? "border-l-4 border-l-blue-500 bg-blue-500/5" : ""}
                data-testid={`card-admin-lost-${item.id}`}
                data-unread={isUnread ? "true" : "false"}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                      {item.vehicleNumber || `Vehicle #${item.vehicleId}`}
                      {isUnread && (
                        <Badge
                          className="text-[10px] px-1.5 py-0 h-4 bg-blue-500 hover:bg-blue-500"
                          data-testid={`badge-admin-lost-unread-${item.id}`}
                        >
                          Unread
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground shrink-0">{new Date(item.reportedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  {item.message && (
                    <p
                      className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap"
                      data-testid={`text-admin-lost-message-${item.id}`}
                    >
                      {item.message}
                    </p>
                  )}
                  {item.finderContact && (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`text-admin-lost-contact-${item.id}`}
                    >
                      Contact: {item.finderContact}
                    </p>
                  )}
                  {location && (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`text-admin-lost-location-${item.id}`}
                    >
                      📍{" "}
                      {location.mapsUrl ? (
                        <a
                          href={location.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                          title="Open in Google Maps"
                          data-testid={`link-admin-lost-location-${item.id}`}
                        >
                          {location.label}
                        </a>
                      ) : (
                        location.label
                      )}
                    </p>
                  )}
                  {item.photos.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-1.5">
                      {item.photos
                        .filter((p) => typeof p === "string" && (p.startsWith("data:image/") || p.startsWith("/objects/")))
                        .map((photo, i) => {
                          const src = resolvePhotoSrc(photo);
                          return (
                            <a
                              key={i}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open full size in new tab"
                            >
                              <img
                                src={src}
                                alt={`lost item photo ${i + 1}`}
                                className="w-14 h-14 object-cover rounded-md border hover:opacity-80 transition-opacity"
                                data-testid={`img-admin-lost-photo-${item.id}-${i}`}
                              />
                            </a>
                          );
                        })}
                    </div>
                  )}
                  <div className="flex justify-end pt-1.5">
                    {isUnread ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate({ itemId: item.id })}
                        data-testid={`button-admin-lost-mark-handled-${item.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Mark as handled
                      </Button>
                    ) : (
                      <span
                        className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
                        data-testid={`text-admin-lost-handled-${item.id}`}
                      >
                        <CheckCircle className="w-3 h-3 text-green-600" /> Handled
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sticker Orders Tab ───────────────────────────────────────────────────────
const PRODUCT_NAMES: Record<string, string> = {
  basic_vinyl: "Basic Vinyl",
  premium_weatherproof: "Premium Weatherproof",
  pack_of_3: "Pack of 3",
};

const ADMIN_STYLE_BY_ID = Object.fromEntries(STICKER_DESIGNS.map(d => [d.id, d]));

function StickerOrderStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500 text-white text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-[10px]"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  if (status === "screenshot_uploaded") return <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]"><Clock className="w-3 h-3 mr-1" />Screenshot</Badge>;
  if (status === "pending_verification") return <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending Verification</Badge>;
  return <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "delivered") return <Badge className="bg-green-500 text-white text-[10px]">Delivered</Badge>;
  if (status === "shipped") return <Badge className="bg-blue-500 text-white text-[10px]"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
  if (status === "printed") return <Badge variant="secondary" className="text-[10px]">Printed</Badge>;
  if (status === "cancelled") return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
  return <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
}

function StickerOrdersTab() {
  const { data, isLoading, refetch } = useGetAdminStickerOrders({});
  const updateOrder = useUpdateStickerOrder();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<number, string>>({});
  const [noteInput, setNoteInput] = useState<Record<number, string>>({});

  const orders = data?.orders ?? [];

  async function handleUpdate(
    orderId: number,
    updates: { paymentStatus?: string; orderStatus?: string; trackingNumber?: string; adminNote?: string }
  ) {
    try {
      await updateOrder.mutateAsync({ orderId, data: updates });
      queryClient.invalidateQueries({ queryKey: ["getAdminStickerOrders"] });
      toast({ title: "Order updated" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  }

  async function downloadOrderPDF(order: {
    id: number;
    vehicleQrCode?: string | null;
    vehicleNumber?: string | null;
    stickerStyle?: string | null;
  }) {
    if (!order.vehicleQrCode) {
      toast({ title: "No QR code linked to this order", variant: "destructive" });
      return;
    }
    if (!order.vehicleNumber) {
      toast({
        title: "Missing vehicle number",
        description: "This order has no vehicle number snapshot — cannot print sticker.",
        variant: "destructive",
      });
      return;
    }
    const styleId = (order.stickerStyle ?? "midnight-carbon") as StickerDesign;
    const design = STICKER_DESIGNS.find(d => d.id === styleId) ?? STICKER_DESIGNS[0];
    const scanUrl = `${window.location.origin}${import.meta.env.BASE_URL}scan/${order.vehicleQrCode}`;
    try {
      await generateStickerPDF(design, scanUrl, order.vehicleNumber);
      toast({ title: "PDF downloaded", description: `${design.name} sticker for ${order.vehicleNumber}` });
    } catch (err) {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Sticker Orders ({data?.total ?? 0})
        </h2>
        <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}

      {!isLoading && orders.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No sticker orders yet.</CardContent></Card>
      )}

      {orders.map(order => {
        const isExpanded = expandedId === order.id;
        return (
          <Card key={order.id} className={isExpanded ? "border-primary/50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{order.orderCode} · {PRODUCT_NAMES[order.product] ?? order.product}</span>
                    <span className="text-xs text-muted-foreground">₹{order.amount}</span>
                    {order.stickerStyle && ADMIN_STYLE_BY_ID[order.stickerStyle] && (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 px-1.5 py-0"
                        style={{
                          borderColor: ADMIN_STYLE_BY_ID[order.stickerStyle]!.accentColor,
                          color: ADMIN_STYLE_BY_ID[order.stickerStyle]!.accentColor,
                        }}
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: ADMIN_STYLE_BY_ID[order.stickerStyle]!.accentColor }}
                        />
                        {ADMIN_STYLE_BY_ID[order.stickerStyle]!.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.customerName} · {order.phone} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.addressLine1}, {order.city}, {order.state} {order.pincode}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <StickerOrderStatusBadge status={order.paymentStatus} />
                  <OrderStatusBadge status={order.orderStatus} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Payment screenshot */}
              {order.screenshotBase64 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Payment Screenshot</p>
                  <img src={order.screenshotBase64} alt="Payment" className="max-h-32 rounded-lg border object-contain" />
                </div>
              )}

              {/* Payment approval buttons */}
              {order.paymentStatus !== "approved" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleUpdate(order.id, { paymentStatus: "approved" })}
                    disabled={updateOrder.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />Approve Payment
                  </Button>
                  {order.paymentStatus !== "rejected" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUpdate(order.id, { paymentStatus: "rejected" })}
                      disabled={updateOrder.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </Button>
                  )}
                </div>
              )}

              {/* Print PDF + Expand for tracking */}
              <div className="flex flex-wrap gap-2">
                {order.vehicleQrCode && order.vehicleNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 h-7"
                    onClick={() => downloadOrderPDF(order)}
                  >
                    <Package className="w-3.5 h-3.5" />Print PDF Sticker · {order.vehicleNumber}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1 -ml-1 h-7"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  {isExpanded ? "Collapse" : "Update Shipping"}
                </Button>
              </div>

              {isExpanded && (
                <div className="space-y-3 pt-1 border-t">
                  {/* Order status */}
                  <div>
                    <p className="text-xs font-medium mb-1">Order Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["pending", "printed", "shipped", "delivered", "cancelled"].map(s => (
                        <Button
                          key={s}
                          size="sm"
                          variant={order.orderStatus === s ? "default" : "outline"}
                          className="text-xs h-7 capitalize"
                          onClick={() => handleUpdate(order.id, { orderStatus: s })}
                          disabled={updateOrder.isPending}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Tracking number */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tracking number (optional)"
                      value={trackingInput[order.id] ?? order.trackingNumber ?? ""}
                      onChange={e => setTrackingInput(t => ({ ...t, [order.id]: e.target.value }))}
                      className="text-sm h-8"
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => handleUpdate(order.id, { trackingNumber: trackingInput[order.id] ?? order.trackingNumber ?? "" })}
                      disabled={updateOrder.isPending}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Admin note */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Admin note (shown to user)"
                      value={noteInput[order.id] ?? order.adminNote ?? ""}
                      onChange={e => setNoteInput(n => ({ ...n, [order.id]: e.target.value }))}
                      className="text-sm h-8"
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => handleUpdate(order.id, { adminNote: noteInput[order.id] ?? order.adminNote ?? "" })}
                      disabled={updateOrder.isPending}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────
export default function Admin() {
  const { data: me, isLoading: meLoading } = useGetMe();

  if (meLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm mt-1">You don't have admin privileges to view this page.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = "/"}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform management and oversight</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1 w-full">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
            <TabsTrigger value="vehicles" className="text-xs">Vehicles</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
            <TabsTrigger value="sticker-orders" className="text-xs">Sticker Orders</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Pay Settings</TabsTrigger>
            <TabsTrigger value="qr" className="text-xs">QR Settings</TabsTrigger>
            <TabsTrigger value="accidents" className="text-xs">Accidents</TabsTrigger>
            <TabsTrigger value="lost" className="text-xs">Lost Items</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs">Legal</TabsTrigger>
            <TabsTrigger value="faqs" className="text-xs">FAQs</TabsTrigger>
            <TabsTrigger value="testimonials" className="text-xs">Testimonials</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="vehicles" className="mt-4"><VehiclesTab /></TabsContent>
          <TabsContent value="payments" className="mt-4"><PaymentRequestsTab /></TabsContent>
          <TabsContent value="sticker-orders" className="mt-4"><StickerOrdersTab /></TabsContent>
          <TabsContent value="settings" className="mt-4"><PaymentSettingsTab /></TabsContent>
          <TabsContent value="qr" className="mt-4"><QrSettingsTab /></TabsContent>
          <TabsContent value="accidents" className="mt-4"><AccidentReportsTab /></TabsContent>
          <TabsContent value="lost" className="mt-4"><LostItemsTab /></TabsContent>
          <TabsContent value="alerts" className="mt-4"><AlertsTab /></TabsContent>
          <TabsContent value="messages" className="mt-4"><ContactMessagesTab /></TabsContent>
          <TabsContent value="legal" className="mt-4"><LegalEditorTab /></TabsContent>
          <TabsContent value="faqs" className="mt-4"><FaqsTab /></TabsContent>
          <TabsContent value="testimonials" className="mt-4"><TestimonialsTab /></TabsContent>
          <TabsContent value="tickets" className="mt-4"><SupportTicketsTab /></TabsContent>
        </Tabs>
    </div>
  );
}
