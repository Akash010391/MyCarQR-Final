import { useState } from "react";
import { useGetAccidentReports, useMarkAccidentReportRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MapPin, Clock, Car, Image, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PremiumGate } from "@/components/premium-gate";
import { resolvePhotoSrc } from "@/lib/photoUrl";

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function ReportCard({ report }: { report: { id: number; vehicleId: number; vehicleNumber?: string; description: string; photos: string[]; latitude?: string | null; longitude?: string | null; locationLabel?: string | null; reportedAt: string; isRead: boolean } }) {
  const [expanded, setExpanded] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const markRead = useMarkAccidentReportRead();
  const queryClient = useQueryClient();

  function handleMarkRead() {
    markRead.mutate({ reportId: report.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/accident-reports"] }),
    });
  }

  return (
    <Card className={`transition-all ${!report.isRead ? "border-orange-300 dark:border-orange-700 shadow-orange-100 dark:shadow-none shadow-md" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!report.isRead ? "bg-orange-100 dark:bg-orange-950/40" : "bg-muted"}`}>
            <AlertTriangle className={`w-5 h-5 ${!report.isRead ? "text-orange-600" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                {report.vehicleNumber || `Vehicle #${report.vehicleId}`}
              </p>
              {!report.isRead && (
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">New</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formatDate(report.reportedAt)}
            </p>

            <p className="text-sm mt-2 line-clamp-2">{report.description}</p>

            {(report.locationLabel || (report.latitude && report.longitude)) && (
              <a
                href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                <MapPin className="w-3 h-3" />
                {report.locationLabel || `${report.latitude}, ${report.longitude}`}
              </a>
            )}

            {report.photos.length > 0 && (
              <div className="mt-3">
                <button
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded(e => !e)}
                >
                  <Image className="w-3.5 h-3.5" />
                  {report.photos.length} photo{report.photos.length > 1 ? "s" : ""}
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expanded && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {report.photos.map((photo, i) => (
                      <button key={i} onClick={() => setPhotoIdx(i)} className="relative">
                        <img
                          src={resolvePhotoSrc(photo)}
                          alt={`Photo ${i + 1}`}
                          className={`w-20 h-20 object-cover rounded-lg border-2 transition-all ${photoIdx === i ? "border-primary" : "border-border"}`}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {expanded && report.photos[photoIdx] && (
                  <img
                    src={resolvePhotoSrc(report.photos[photoIdx])}
                    alt="Full size"
                    className="mt-2 w-full max-h-72 object-contain rounded-xl border"
                  />
                )}
              </div>
            )}

            {!report.isRead && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-7 text-xs gap-1.5"
                onClick={handleMarkRead}
                disabled={markRead.isPending}
                data-testid={`button-mark-accident-read-${report.id}`}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccidentReportsPage() {
  const { data: reports = [], isLoading } = useGetAccidentReports();
  const unread = reports.filter(r => !r.isRead).length;

  return (
    <PremiumGate
      featureName="Accident Reports"
      description="View accident witness reports submitted by people who scanned your vehicle QR. This premium feature helps you stay informed about incidents involving your vehicle."
    >
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Accident Reports</h1>
              {unread > 0 && <Badge className="bg-orange-500 text-white">{unread} new</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">Witness reports submitted via your vehicle QR</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No accident reports</h3>
            <p className="text-muted-foreground text-sm">
              When a witness scans your QR and submits an accident report, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={{ ...r, photos: r.photos as string[], vehicleNumber: (r as { vehicleNumber?: string }).vehicleNumber }} />
          ))}
        </div>
      )}
    </div>
    </PremiumGate>
  );
}
