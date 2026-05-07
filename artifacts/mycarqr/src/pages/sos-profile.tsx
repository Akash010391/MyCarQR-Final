import { useState, useEffect } from "react";
import { useGetSosProfile, useUpsertSosProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse, Phone, User, Droplets, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PremiumGate } from "@/components/premium-gate";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function SosProfilePage() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetSosProfile();
  const upsert = useUpsertSosProfile();

  const [form, setForm] = useState({
    emergencyContactName: "",
    emergencyPhone: "",
    bloodGroup: "",
    medicalNotes: "",
    altContactName: "",
    altContactPhone: "",
    isEnabled: false,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        emergencyContactName: profile.emergencyContactName || "",
        emergencyPhone: profile.emergencyPhone || "",
        bloodGroup: profile.bloodGroup || "",
        medicalNotes: profile.medicalNotes || "",
        altContactName: profile.altContactName || "",
        altContactPhone: profile.altContactPhone || "",
        isEnabled: profile.isEnabled || false,
      });
    }
  }, [profile]);

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    upsert.mutate(
      { data: form },
      {
        onSuccess: () => toast({ title: "SOS profile saved", description: "Witnesses can now see your emergency info when they scan your QR." }),
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <PremiumGate featureName="SOS Emergency Profile">
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </PremiumGate>
    );
  }

  return (
    <PremiumGate
      featureName="SOS Emergency Profile"
      description="Store your emergency contacts, blood group, and medical notes. When someone scans your QR in an emergency, they can instantly see how to help you."
    >
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SOS Emergency Profile</h1>
            <p className="text-muted-foreground text-sm">Shown to witnesses in case of an accident</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          When someone scans your QR code in an emergency, they can tap <strong>Emergency Help</strong> to see this information. Your phone number is shown so first responders can contact your family.
        </p>
      </div>

      {/* Enable toggle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold">Enable Emergency Profile</p>
                <p className="text-sm text-muted-foreground">Allow witnesses to see this info via your QR</p>
              </div>
            </div>
            <Switch
              checked={form.isEnabled}
              onCheckedChange={(v) => set("isEnabled", v)}
              data-testid="toggle-sos-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4 text-red-500" />
            Primary Emergency Contact
          </CardTitle>
          <CardDescription>First person to be contacted in an emergency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Contact Name</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Priya Sharma (Wife)"
              value={form.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
              data-testid="input-emergency-contact-name"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              className="mt-1.5"
              placeholder="+91 98765 43210"
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => set("emergencyPhone", e.target.value)}
              data-testid="input-emergency-phone"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alternate Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-blue-500" />
            Alternate Contact
          </CardTitle>
          <CardDescription>Second person to contact if primary is unreachable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Contact Name</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Rahul Sharma (Brother)"
              value={form.altContactName}
              onChange={(e) => set("altContactName", e.target.value)}
              data-testid="input-alt-contact-name"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              className="mt-1.5"
              placeholder="+91 98765 43211"
              type="tel"
              value={form.altContactPhone}
              onChange={(e) => set("altContactPhone", e.target.value)}
              data-testid="input-alt-contact-phone"
            />
          </div>
        </CardContent>
      </Card>

      {/* Medical Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="w-4 h-4 text-rose-500" />
            Medical Information
          </CardTitle>
          <CardDescription>Critical information for first responders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Blood Group</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => set("bloodGroup", form.bloodGroup === bg ? "" : bg)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                    form.bloodGroup === bg
                      ? "bg-red-600 text-white border-red-600"
                      : "border-border hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                  }`}
                  data-testid={`blood-group-${bg}`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Medical Notes
            </Label>
            <Textarea
              className="mt-1.5 resize-none"
              placeholder="e.g. Allergic to penicillin. Diabetic. On blood thinners."
              rows={3}
              value={form.medicalNotes}
              onChange={(e) => set("medicalNotes", e.target.value)}
              data-testid="textarea-medical-notes"
            />
            <p className="text-xs text-muted-foreground mt-1">List any allergies, conditions, or medications</p>
          </div>
        </CardContent>
      </Card>

      {/* Status preview */}
      {form.isEnabled && (form.emergencyContactName || form.emergencyPhone || form.bloodGroup) && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">Preview — What witnesses will see</p>
            <div className="space-y-1 text-sm">
              {form.emergencyContactName && <p><span className="text-muted-foreground">Contact:</span> {form.emergencyContactName}</p>}
              {form.emergencyPhone && <p><span className="text-muted-foreground">Phone:</span> {form.emergencyPhone}</p>}
              {form.bloodGroup && <p><span className="text-muted-foreground">Blood Group:</span> <Badge className="ml-1 bg-red-600 text-white text-xs">{form.bloodGroup}</Badge></p>}
              {form.medicalNotes && <p><span className="text-muted-foreground">Medical:</span> {form.medicalNotes}</p>}
              {form.altContactName && <p><span className="text-muted-foreground">Alt Contact:</span> {form.altContactName} {form.altContactPhone}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={upsert.isPending}
        data-testid="button-save-sos-profile"
      >
        {upsert.isPending ? "Saving..." : "Save Emergency Profile"}
      </Button>
    </div>
    </PremiumGate>
  );
}
