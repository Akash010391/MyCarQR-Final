import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { Car, Bell, FileText, QrCode, Plus, Shield, AlertTriangle, CheckCircle, TrendingUp, CreditCard, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardSummary, useGetMe } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function StatCard({ title, value, icon: Icon, sub, color, emptyHint }: {
  title: string; value: number | string; icon: React.ElementType; sub?: string; color?: string; emptyHint?: string;
}) {
  const showEmpty = emptyHint && (value === 0 || value === "—");
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={cn("text-2xl font-bold mt-1", color || "text-foreground")}>{value}</p>
            {showEmpty ? (
              <p className="text-xs text-muted-foreground mt-0.5">{emptyHint}</p>
            ) : sub ? (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            ) : null}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color ? "bg-current/10" : "bg-primary/10")}>
            <Icon className={cn("w-5 h-5", color || "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getSafetyDisplay(summary: any, user: any): { value: string; color: string; sub: string } {
  if (!summary || summary.totalVehicles === 0) {
    return { value: "—", color: "text-muted-foreground", sub: "Add a vehicle to start" };
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  if (createdAt) {
    const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation < 7) {
      return { value: "—", color: "text-muted-foreground", sub: "Calculating after 7 days" };
    }
  }

  const score = summary.averageSafetyScore ?? 0;
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  return { value: `${score}%`, color, sub: "Average across vehicles" };
}

export default function Dashboard() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: me } = useGetMe();

  const alertTypeLabels: Record<string, string> = {
    move_vehicle: "Please move vehicle",
    lights_on: "Lights are on",
    blocking_way: "Blocking the way",
    window_open: "Window is open",
    emergency: "Emergency",
    damage: "Minor damage noticed",
    wrong_parking: "Wrong parking",
  };

  const hasPhone = clerkLoaded ? (user?.phoneNumbers?.length ?? 0) > 0 : true;
  const safety = getSafetyDisplay(summary, clerkLoaded ? user : null);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening with your vehicles</p>
        </div>
        <Link href="/vehicles/add">
          <Button className="w-full sm:w-auto" data-testid="button-add-vehicle">
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {!isLoading && !hasPhone && (
        <Link href="/profile">
          <div
            className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-amber-500/40 transition-colors"
            data-testid="banner-complete-profile"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Complete your profile</p>
              <p className="text-xs text-muted-foreground">Add your phone number so vehicle scanners can reach you</p>
            </div>
            <Button size="sm" variant="outline" className="flex-shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10">
              Add Phone
            </Button>
          </div>
        </Link>
      )}

      {me?.plan === "free" && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">You're on the Free plan</p>
              <p className="text-xs text-muted-foreground">Unlock unlimited vehicles, SOS Profile, Accident Witness Mode, and more</p>
            </div>
          </div>
          <Link href="/payment">
            <Button size="sm" className="flex-shrink-0 gap-1.5" data-testid="button-upgrade-banner">
              Upgrade ₹99/mo
            </Button>
          </Link>
        </div>
      )}
      {me?.plan === "premium" && me?.premiumExpiresAt && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">
            Premium active · expires {new Date(me.premiumExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Vehicles"
            value={summary?.totalVehicles ?? 0}
            icon={Car}
            sub={`${summary?.activeQrCodes ?? 0} QR active`}
            emptyHint="Add your first vehicle"
          />
          <StatCard
            title="Alerts (Month)"
            value={summary?.totalAlertsThisMonth ?? 0}
            icon={Bell}
            sub={`${summary?.unreadAlerts ?? 0} unread`}
            color={summary?.unreadAlerts ? "text-red-500" : undefined}
            emptyHint="No alerts this month ✓"
          />
          <StatCard
            title="Safety Score"
            value={safety.value}
            icon={Shield}
            sub={safety.sub}
            color={safety.color}
          />
          <StatCard
            title="Doc Alerts"
            value={(summary?.documentsExpired ?? 0) + (summary?.documentsExpiringSoon ?? 0)}
            icon={FileText}
            sub={`${summary?.documentsExpired ?? 0} expired`}
            color={(summary?.documentsExpired ?? 0) > 0 ? "text-red-500" : undefined}
            emptyHint="All documents up to date ✓"
          />
        </div>
      )}

      {!isLoading && ((summary?.documentsExpired ?? 0) > 0 || (summary?.documentsExpiringSoon ?? 0) > 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-sm text-amber-800 dark:text-amber-200">Document Alerts</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {summary!.documentsExpired > 0 && `${summary!.documentsExpired} document(s) expired. `}
            {summary!.documentsExpiringSoon > 0 && `${summary!.documentsExpiringSoon} document(s) expiring soon.`}
          </p>
          <Link href="/documents">
            <Button variant="link" size="sm" className="px-0 mt-1 text-amber-700 dark:text-amber-300 h-auto" data-testid="link-view-documents">
              View Documents
            </Button>
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recent Alerts</h2>
          <Link href="/alerts">
            <Button variant="link" size="sm" className="h-auto p-0" data-testid="link-all-alerts">View all</Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (summary?.recentAlerts ?? []).length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-10 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No scan alerts yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Your alerts will appear here when someone scans your QR.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary!.recentAlerts.map((alert: any) => (
              <div
                key={alert.id}
                className={cn("flex items-center gap-4 rounded-xl border p-4 transition-colors", !alert.isRead && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800")}
                data-testid={`alert-item-${alert.id}`}
              >
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", alert.isRead ? "bg-muted" : "bg-blue-500")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alertTypeLabels[alert.alertType] || alert.alertType}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.vehicleNumber} · {new Date(alert.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!alert.isRead && <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">New</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/vehicles", label: "My Vehicles", icon: Car },
          { href: "/alerts", label: "View Alerts", icon: Bell },
          { href: "/documents", label: "Documents", icon: FileText },
          { href: "/payment", label: "Upgrade Plan", icon: CreditCard },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <div
              data-testid={`quick-link-${l.href.slice(1)}`}
              className="border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <l.icon className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium">{l.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
