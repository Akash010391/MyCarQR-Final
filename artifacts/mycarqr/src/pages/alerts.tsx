import { Bell, CheckCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAlerts, getGetAlertsQueryKey, useMarkAlertRead, useMarkAllAlertsRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

const alertTypeLabels: Record<string, string> = {
  move_vehicle: "Please move your vehicle",
  lights_on: "Your lights are on",
  blocking_way: "Vehicle is blocking the way",
  window_open: "Window is open",
  emergency: "Emergency",
  damage: "Minor damage noticed",
  wrong_parking: "Wrong parking",
};

const alertTypeColors: Record<string, string> = {
  move_vehicle: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  lights_on: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  blocking_way: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  window_open: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  emergency: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  damage: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  wrong_parking: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

export default function Alerts() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useGetAlerts(
    unreadOnly ? { unreadOnly: true } : {},
    { query: { queryKey: getGetAlertsQueryKey(unreadOnly ? { unreadOnly: true } : {}) } }
  );
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  function handleMarkRead(alertId: number) {
    markRead.mutate({ alertId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
      },
    });
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
        toast({ title: "All alerts marked as read" });
      },
    });
  }

  const unreadCount = alerts?.filter(a => !a.isRead).length ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Scan Alerts
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Notifications when someone scans your vehicle QR</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={cn(unreadOnly && "border-primary text-primary")}
            data-testid="button-filter-unread"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            {unreadOnly ? "Unread" : "All"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending} data-testid="button-mark-all-read">
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="rounded-2xl border bg-muted/20 p-16 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">No scan alerts yet</h2>
          <p className="text-muted-foreground text-sm">Your alerts will appear here when someone scans your QR.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts!.map((alert) => (
            <div
              key={alert.id}
              data-testid={`alert-item-${alert.id}`}
              className={cn(
                "border rounded-xl p-4 transition-colors",
                !alert.isRead && "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", alert.isRead ? "bg-muted-foreground/30" : "bg-blue-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("text-xs font-medium", alertTypeColors[alert.alertType] || "bg-muted text-muted-foreground")}>
                      {alertTypeLabels[alert.alertType] || alert.alertType}
                    </Badge>
                    {alert.vehicleNumber && (
                      <span className="text-xs text-muted-foreground">{alert.vehicleNumber}</span>
                    )}
                  </div>
                  {alert.message && (
                    <p className="text-sm mt-1 text-foreground">{alert.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.createdAt).toLocaleString()}
                    {alert.scannerLocation && ` · ${alert.scannerLocation}`}
                  </p>
                </div>
                {!alert.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkRead(alert.id)}
                    className="flex-shrink-0 text-xs h-7"
                    data-testid={`button-mark-read-${alert.id}`}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
