import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Prefs {
  scanAlerts: boolean;
  smsAlerts: boolean;
  emailAlerts: boolean;
  emergencyAlerts: boolean;
  orderUpdates: boolean;
}

const FIELDS: { key: keyof Prefs; label: string; help: string }[] = [
  { key: "scanAlerts", label: "Scan alerts", help: "When someone scans your QR code" },
  { key: "emergencyAlerts", label: "Emergency & SOS", help: "Accident, lost-key and emergency events" },
  { key: "emailAlerts", label: "Email notifications", help: "Receive copies of alerts by email" },
  { key: "smsAlerts", label: "SMS notifications", help: "Critical alerts via text message" },
  { key: "orderUpdates", label: "Order updates", help: "Sticker shipping & payment confirmations" },
];

export default function NotificationsTab() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${basePath}/api/me/notifications`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPrefs(d))
      .catch(() => {
        toast({ title: "Could not load preferences", variant: "destructive" });
      });
  }, [toast]);

  function update<K extends keyof Prefs>(k: K, v: boolean) {
    setPrefs((p) => (p ? { ...p, [k]: v } : p));
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/api/me/notifications`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Preferences saved" });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notification preferences</CardTitle>
        <CardDescription>Choose how you want to be alerted by MyCarQR.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {!prefs ? (
          <div className="space-y-3">
            {FIELDS.map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            {FIELDS.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-4 py-3 border-b last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.help}</p>
                </div>
                <Switch
                  checked={prefs[f.key]}
                  onCheckedChange={(v) => update(f.key, v)}
                  data-testid={`switch-${f.key}`}
                />
              </div>
            ))}
            <div className="pt-4">
              <Button onClick={save} disabled={saving} data-testid="button-save-notifications">
                {saving ? "Saving..." : "Save preferences"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
