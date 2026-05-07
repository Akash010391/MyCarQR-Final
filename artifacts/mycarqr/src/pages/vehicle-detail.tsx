import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetVehicle, getGetVehicleQueryKey, useToggleVehicleQr, useDeleteVehicle, getGetVehiclesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Copy, ExternalLink, Edit, Trash2, Shield, QrCode, ToggleLeft, ToggleRight, CheckCircle, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function buildScanUrl(qrCode: string): string {
  return `${window.location.origin}${basePath}/scan/${qrCode}`;
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const toggleQr = useToggleVehicleQr();
  const deleteVehicle = useDeleteVehicle();

  const { data: vehicle, isLoading } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId, queryKey: getGetVehicleQueryKey(vehicleId) }
  });

  useEffect(() => {
    if (vehicle?.qrCode && vehicle.qrActive && qrCanvasRef.current) {
      const url = buildScanUrl(vehicle.qrCode);
      setQrUrl(url);
      QRCode.toCanvas(qrCanvasRef.current, url, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#1a3a6e", light: "#ffffff" }
      }).then(() => {
        // Logo overlay — draw "MQ" initials centred on the QR
        const canvas = qrCanvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = canvas.width * 0.12;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a3a6e";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(r * 0.9)}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MQ", cx, cy);
      });
    }
  }, [vehicle]);

  function downloadQr() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `mycarqr-${vehicle?.vehicleNumber ?? "vehicle"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function copyLink() {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      toast({ title: "Link copied!", description: "Scan link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function testQrLink() {
    if (!qrUrl) return;
    window.open(qrUrl, "_blank", "noopener,noreferrer");
  }

  function handleToggleQr() {
    if (!vehicle) return;
    toggleQr.mutate({ vehicleId, data: { active: !vehicle.qrActive } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(vehicleId) });
        toast({ title: vehicle.qrActive ? "QR disabled" : "QR enabled" });
      },
    });
  }

  function handleDelete() {
    if (!confirm("Delete this vehicle? This cannot be undone.")) return;
    deleteVehicle.mutate({ vehicleId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVehiclesQueryKey() });
        toast({ title: "Vehicle deleted" });
        setLocation("/vehicles");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!vehicle) {
    return <div className="p-6 text-center text-muted-foreground">Vehicle not found.</div>;
  }

  const safetyColor = vehicle.safetyScore >= 80 ? "text-green-500" : vehicle.safetyScore >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vehicles">
            <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-vehicle-number">{vehicle.vehicleNumber}</h1>
            <p className="text-muted-foreground text-sm">{vehicle.brand} {vehicle.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/vehicles/${vehicle.id}/edit`}>
            <Button variant="outline" size="icon" data-testid="button-edit"><Edit className="w-4 h-4" /></Button>
          </Link>
          <Button variant="outline" size="icon" onClick={handleDelete} data-testid="button-delete" className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* QR Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4" /> QR Code
            <Badge className={cn("ml-auto text-xs", vehicle.qrActive ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground")}>
              {vehicle.qrActive ? "Active" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehicle.qrActive ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-md border">
                <canvas ref={qrCanvasRef} data-testid="qr-canvas" />
              </div>

              {/* Scan URL display */}
              <div className="w-full bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground break-all text-center">
                {qrUrl}
              </div>

              {/* Primary actions: Download + Copy Link */}
              <div className="flex gap-3 w-full">
                <Button onClick={downloadQr} variant="outline" className="flex-1" data-testid="button-download-qr">
                  <Download className="w-4 h-4 mr-2" />Download QR
                </Button>
                <Button onClick={copyLink} variant="outline" className="flex-1" data-testid="button-copy-link">
                  {copied ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>

              {/* Test QR Link button */}
              <Button
                onClick={testQrLink}
                variant="secondary"
                className="w-full"
                data-testid="button-test-qr-link"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Test QR Link
              </Button>

              {/* Design QR Sticker */}
              <Link href={`/vehicles/${vehicle.id}/qr-studio`} className="w-full block">
                <Button
                  variant="default"
                  className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
                  data-testid="button-design-sticker"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Design QR Sticker
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">QR is currently disabled</p>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleToggleQr}
            disabled={toggleQr.isPending}
            data-testid="button-toggle-qr"
          >
            {vehicle.qrActive ? <ToggleRight className="w-4 h-4 mr-2 text-green-500" /> : <ToggleLeft className="w-4 h-4 mr-2" />}
            {vehicle.qrActive ? "Disable QR" : "Enable QR"}
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Type", value: vehicle.vehicleType },
            { label: "Brand & Model", value: `${vehicle.brand} ${vehicle.model}` },
            { label: "Color", value: vehicle.color },
            { label: "Owner", value: vehicle.ownerName },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium capitalize">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Safety */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Safety Score</p>
              <p className="text-sm text-muted-foreground">Based on contact info and privacy settings</p>
            </div>
            <div className="text-right">
              <p className={cn("text-3xl font-extrabold", safetyColor)} data-testid="text-safety-score">
                {vehicle.safetyScore}%
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", vehicle.safetyScore >= 80 ? "bg-green-500" : vehicle.safetyScore >= 50 ? "bg-yellow-500" : "bg-red-500")}
              style={{ width: `${vehicle.safetyScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Privacy Mode
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {vehicle.privacyMode ? "Your contact is hidden. Scanners use in-app alerts." : "Contact visible to scanners on the public page."}
            </p>
          </div>
          <Badge className={vehicle.privacyMode ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground"} data-testid="badge-privacy-mode">
            {vehicle.privacyMode ? "On" : "Off"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
