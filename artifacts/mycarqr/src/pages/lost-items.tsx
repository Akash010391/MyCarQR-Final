import { useState } from "react";
import { useGetLostItems, useMarkLostItemRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, MapPin, Clock, Car, Phone, Image, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PremiumGate } from "@/components/premium-gate";
import { resolvePhotoSrc } from "@/lib/photoUrl";

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function ItemCard({ item }: { item: { id: number; vehicleId: number; vehicleNumber?: string; message: string; photos: string[]; latitude?: string | null; longitude?: string | null; locationLabel?: string | null; finderContact?: string | null; reportedAt: string; isRead: boolean } }) {
  const [expanded, setExpanded] = useState(false);
  const markRead = useMarkLostItemRead();
  const queryClient = useQueryClient();

  function handleMarkRead() {
    markRead.mutate({ itemId: item.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lost-items"] }),
    });
  }

  return (
    <Card className={`transition-all ${!item.isRead ? "border-emerald-300 dark:border-emerald-700 shadow-emerald-100 dark:shadow-none shadow-md" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!item.isRead ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"}`}>
            <KeyRound className={`w-5 h-5 ${!item.isRead ? "text-emerald-600" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                {item.vehicleNumber || `Vehicle #${item.vehicleId}`}
              </p>
              {!item.isRead && (
                <Badge className="bg-emerald-500 text-white text-xs px-1.5 py-0">New</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formatDate(item.reportedAt)}
            </p>

            <p className="text-sm mt-2">{item.message}</p>

            {item.finderContact && (
              <p className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 mt-1.5 font-medium">
                <Phone className="w-3.5 h-3.5" />
                Finder: {item.finderContact}
              </p>
            )}

            {(item.locationLabel || (item.latitude && item.longitude)) && (
              <a
                href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1 ml-1"
              >
                <MapPin className="w-3 h-3" />
                {item.locationLabel || `${item.latitude}, ${item.longitude}`}
              </a>
            )}

            {item.photos.length > 0 && (
              <div className="mt-3">
                <button
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded(e => !e)}
                >
                  <Image className="w-3.5 h-3.5" />
                  {item.photos.length} photo{item.photos.length > 1 ? "s" : ""}
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expanded && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {item.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={resolvePhotoSrc(photo)}
                        alt={`Photo ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!item.isRead && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-7 text-xs gap-1.5"
                onClick={handleMarkRead}
                disabled={markRead.isPending}
                data-testid={`button-mark-lost-read-${item.id}`}
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

export default function LostItemsPage() {
  const { data: items = [], isLoading } = useGetLostItems();
  const unread = items.filter(i => !i.isRead).length;

  return (
    <PremiumGate
      featureName="Lost Key Returns"
      description="Receive messages from people who found your keys or lost items and scanned your vehicle QR. This premium feature helps you recover lost belongings quickly."
    >
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Lost Key Returns</h1>
              {unread > 0 && <Badge className="bg-emerald-500 text-white">{unread} new</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">Reports from people who found your keys or items</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No lost item reports</h3>
            <p className="text-muted-foreground text-sm">
              When someone finds your keys and scans your QR to return them, their message will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <ItemCard key={i.id} item={{ ...i, photos: i.photos as string[], vehicleNumber: (i as { vehicleNumber?: string }).vehicleNumber }} />
          ))}
        </div>
      )}
    </div>
    </PremiumGate>
  );
}
