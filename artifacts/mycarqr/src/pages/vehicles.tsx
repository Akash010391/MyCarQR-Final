import { Link } from "wouter";
import { Plus, Car, QrCode, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetVehicles } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const vehicleTypeIcons: Record<string, string> = {
  car: "🚗",
  bike: "🏍️",
  scooter: "🛵",
  commercial: "🚚",
};

export default function Vehicles() {
  const { data: vehicles, isLoading } = useGetVehicles();

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Vehicles</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your registered vehicles and QR codes</p>
        </div>
        <Link href="/vehicles/add">
          <Button data-testid="button-add-vehicle">
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : !vehicles || vehicles.length === 0 ? (
        <div className="rounded-2xl border bg-muted/20 p-16 text-center">
          <Car className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No vehicles yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Add your first vehicle to generate your smart QR.</p>
          <Link href="/vehicles/add">
            <Button data-testid="button-add-first-vehicle">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Vehicle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles!.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`}>
              <div
                data-testid={`vehicle-card-${v.id}`}
                className="border rounded-2xl p-5 hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {vehicleTypeIcons[v.vehicleType] || "🚗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{v.vehicleNumber}</h3>
                      <Badge variant={v.qrActive ? "default" : "secondary"} className={cn(
                        "text-xs",
                        v.qrActive ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""
                      )}>
                        {v.qrActive ? "QR Active" : "QR Disabled"}
                      </Badge>
                      {v.privacyMode && (
                        <Badge variant="outline" className="text-xs"><Shield className="w-3 h-3 mr-1" />Private</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {v.brand} {v.model} · {v.color}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Shield className={cn("w-4 h-4", v.safetyScore >= 80 ? "text-green-500" : v.safetyScore >= 50 ? "text-yellow-500" : "text-red-500")} />
                      <span className="text-sm font-semibold">{v.safetyScore}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Safety</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
