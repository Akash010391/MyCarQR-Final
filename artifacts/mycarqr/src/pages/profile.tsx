import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, useClerk } from "@clerk/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  useGetMe, useGetVehicles, useGetSosProfile, useUpdateMyProfile,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Shield, User, Car, CreditCard, Bell, HeartPulse, LifeBuoy,
  Settings as SettingsIcon, ShoppingBag, ChevronRight, ExternalLink,
  Camera, LogOut, Phone, Mail, Save, Pencil, Check, X,
} from "lucide-react";
import NotificationsTab from "@/components/profile/notifications-tab";
import HelpTab from "@/components/profile/help-tab";
import DangerZone from "@/components/profile/danger-zone";

const TABS = [
  { value: "account", label: "Account", icon: User },
  { value: "vehicles", label: "Vehicles", icon: Car },
  { value: "subscription", label: "Plan", icon: CreditCard },
  { value: "orders", label: "Orders", icon: ShoppingBag },
  { value: "notifications", label: "Alerts", icon: Bell },
  { value: "emergency", label: "SOS", icon: HeartPulse },
  { value: "help", label: "Help", icon: LifeBuoy },
  { value: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isTab(v: string | null): v is TabValue {
  return !!v && TABS.some((t) => t.value === v);
}

function NavRow({ to, title, hint, testId }: { to: string; title: string; hint: string; testId: string }) {
  return (
    <Link href={to}>
      <div
        className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
        data-testid={testId}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{hint}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

function ProfilePhoto({ imageUrl, onPhotoChange }: { imageUrl: string; onPhotoChange: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
        {imageUrl ? (
          <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <User className="w-8 h-8 text-primary" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
        data-testid="button-change-photo"
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPhotoChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function EditableField({
  label,
  value,
  icon: Icon,
  onSave,
  placeholder,
  testId,
  type = "text",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  onSave: (val: string) => Promise<void>;
  placeholder: string;
  testId: string;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm"
              type={type}
              data-testid={`${testId}-input`}
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-green-500 hover:text-green-600"
              onClick={handleSave}
              disabled={saving}
              data-testid={`${testId}-save`}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" data-testid={`${testId}-value`}>
              {value || <span className="text-muted-foreground italic">Not set</span>}
            </p>
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`${testId}-edit`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { signOut } = useClerk();
  const { data: me, isLoading: meLoading } = useGetMe();
  const { data: vehicles = [] } = useGetVehicles();
  const { data: sos } = useGetSosProfile();
  const updateProfile = useUpdateMyProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [photoUploading, setPhotoUploading] = useState(false);

  const [currentTab, setCurrentTab] = useState<TabValue>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      return isTab(t) ? t : "account";
    }
    return "account";
  });

  const setTab = useCallback((value: string) => {
    if (isTab(value)) {
      setCurrentTab(value);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", value);
      window.history.replaceState(null, "", `/profile?${params.toString()}`);
    }
  }, []);

  const isPremium = me?.plan === "premium";
  const displayName = me?.displayName || user?.fullName || "";
  const email = me?.email || user?.primaryEmailAddress?.emailAddress || "";
  const phone = me?.phone || "";
  const imageUrl = user?.imageUrl || "";

  async function handlePhotoChange(file: File) {
    if (!user) return;
    setPhotoUploading(true);
    try {
      await user.setProfileImage({ file });
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({
        title: "Could not update photo",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveField(field: "displayName" | "phone", val: string) {
    try {
      await updateProfile.mutateAsync({ data: { [field]: val } });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated" });
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Please try again";
      toast({ title: "Failed to save", description: msg, variant: "destructive" });
      throw err;
    }
  }

  const loading = meLoading || !clerkLoaded;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your account, vehicles, billing and preferences.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setTab} className="space-y-5">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm"
              data-testid={`tab-${t.value}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Account Tab ── */}
        <TabsContent value="account" className="space-y-5 m-0">
          <Card>
            <CardContent className="p-5">
              {loading ? (
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className="relative">
                    <ProfilePhoto imageUrl={imageUrl} onPhotoChange={handlePhotoChange} />
                    {photoUploading && (
                      <div className="absolute inset-0 bg-background/60 rounded-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold" data-testid="profile-display-name">
                        {displayName || "MyCarQR User"}
                      </h2>
                      <Badge
                        className={isPremium ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}
                        data-testid="badge-plan"
                      >
                        {isPremium ? "Premium" : "Free"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {email}
                    </p>
                    {me?.isAdmin && (
                      <Badge variant="secondary" className="mt-1.5 text-[10px]">
                        <Shield className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Tap the pencil icon to edit a field</CardDescription>
            </CardHeader>
            <CardContent>
              <EditableField
                label="Display Name"
                value={displayName}
                icon={User}
                onSave={(v) => saveField("displayName", v)}
                placeholder="Your name"
                testId="field-name"
              />
              <EditableField
                label="Phone Number"
                value={phone}
                icon={Phone}
                onSave={(v) => saveField("phone", v)}
                placeholder="+91 9999999999"
                testId="field-phone"
                type="tel"
              />
              <div className="flex items-center gap-3 py-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate" data-testid="field-email-value">{email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <NavRow to="/vehicles" title="My Vehicles" hint={`${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} registered`} testId="row-vehicles" />
              <NavRow to="/my-orders" title="My Orders" hint="View sticker orders and tracking" testId="row-orders" />
              <NavRow to="/sos-profile" title="Emergency / SOS Profile" hint={sos?.isEnabled ? "Active" : "Not set up"} testId="row-sos" />
              <NavRow to="/alerts" title="Alerts" hint="View scan alerts and notifications" testId="row-alerts" />
            </CardContent>
          </Card>

          {/* Subscription summary */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isPremium
                    ? <Crown className="w-5 h-5 text-amber-500" />
                    : <Shield className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <p className="font-semibold">{isPremium ? "Premium Plan" : "Free Plan"}</p>
                    <p className="text-sm text-muted-foreground">
                      {isPremium
                        ? me?.premiumExpiresAt
                          ? `Renews ${new Date(me.premiumExpiresAt).toLocaleDateString("en-IN")}`
                          : "All features unlocked"
                        : "Upgrade for unlimited vehicles"}
                    </p>
                  </div>
                </div>
                {!isPremium && (
                  <Link href="/pricing">
                    <Button size="sm" data-testid="button-upgrade">Upgrade</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut({ redirectUrl: "/" })}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </TabsContent>

        {/* ── Vehicles Tab ── */}
        <TabsContent value="vehicles" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your vehicles</CardTitle>
              <CardDescription>
                You have {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} registered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/vehicles">
                <Button className="w-full sm:w-auto" data-testid="button-go-vehicles">
                  Open vehicle manager <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
              </Link>
              <NavRow to="/vehicles/add" title="Add a new vehicle" hint="Generate a QR code in seconds" testId="row-add-vehicle" />
              <NavRow to="/order-sticker" title="Order printed QR sticker" hint="Premium-quality vinyl, delivered" testId="row-order-sticker" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subscription Tab ── */}
        <TabsContent value="subscription" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subscription</CardTitle>
              <CardDescription>Manage your plan and payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{isPremium ? "Premium" : "Free"} plan</p>
                  <p className="text-xs text-muted-foreground">
                    {isPremium ? "Thanks for supporting MyCarQR" : "Upgrade for unlimited vehicles & advanced features"}
                  </p>
                </div>
                {!isPremium && (
                  <Link href="/pricing">
                    <Button size="sm" data-testid="button-go-pricing">View plans</Button>
                  </Link>
                )}
              </div>
              <NavRow to="/payment" title="Payment & upgrade" hint="UPI, refunds and billing" testId="row-payment" />
              <NavRow to="/pricing" title="Compare plans" hint="See what Premium unlocks" testId="row-pricing" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Orders Tab ── */}
        <TabsContent value="orders" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sticker orders</CardTitle>
              <CardDescription>Track shipments and see past orders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/my-orders">
                <Button className="w-full sm:w-auto" data-testid="button-go-orders">
                  Open order history <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
              </Link>
              <NavRow to="/order-sticker" title="Order a new sticker" hint="Premium vinyl QR sticker for your car" testId="row-new-order" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="m-0">
          <NotificationsTab />
        </TabsContent>

        {/* ── Emergency Tab ── */}
        <TabsContent value="emergency" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-500" /> Emergency / SOS profile
              </CardTitle>
              <CardDescription>
                Information shown to first-responders if your QR is scanned during an emergency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sos && sos.isEnabled ? (
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Blood group:</span>{" "}
                    <strong>{sos.bloodGroup || "\u2014"}</strong>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Emergency contact:</span>{" "}
                    <strong>{sos.emergencyContactName || "\u2014"}</strong>{" "}
                    {sos.emergencyPhone && <span>&middot; {sos.emergencyPhone}</span>}
                  </p>
                  {sos.medicalNotes && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Notes:</span> {sos.medicalNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No SOS profile set up yet. Adding one helps emergency responders reach the right people quickly.
                </p>
              )}
              <Link href="/sos-profile">
                <Button className="w-full sm:w-auto" data-testid="button-go-sos">
                  {sos ? "Edit SOS profile" : "Set up SOS profile"}
                  <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Help Tab ── */}
        <TabsContent value="help" className="m-0">
          <HelpTab />
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="space-y-5 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account settings</CardTitle>
              <CardDescription>Quick links and account actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <NavRow to="/privacy" title="Privacy Policy" hint="How we handle your data" testId="row-privacy" />
              <NavRow to="/terms" title="Terms & Conditions" hint="Rules for using MyCarQR" testId="row-terms" />
              <NavRow to="/refund" title="Refund Policy" hint="Plan refunds and credits" testId="row-refund" />
              <NavRow to="/contact" title="Contact us" hint="Get in touch with the team" testId="row-contact" />
            </CardContent>
          </Card>
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
