import { useParams } from "wouter";
import { useState, useRef } from "react";
import {
  useGetPublicVehicle,
  useSendPublicAlert,
  useGetPublicSos,
  useSubmitAccidentReport,
  useSubmitLostItem,
  getGetPublicVehicleQueryKey,
  getGetPublicSosQueryKey,
  requestUploadUrl,
} from "@workspace/api-client-react";
import { resolvePhotoSrc } from "@/lib/photoUrl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  QrCode, Phone, MessageCircle, CheckCircle, Shield, AlertCircle,
  AlertTriangle, KeyRound, HeartPulse, MapPin, Loader2, Camera, X,
  Droplets, PhoneCall
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const alertTypes = [
  { value: "move_vehicle", label: "Please move vehicle", emoji: "🚗", color: "border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30" },
  { value: "lights_on", label: "Lights are on", emoji: "💡", color: "border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/30" },
  { value: "blocking_way", label: "Blocking the way", emoji: "🚧", color: "border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30" },
  { value: "window_open", label: "Window is open", emoji: "🪟", color: "border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30" },
  { value: "emergency", label: "Emergency", emoji: "🚨", color: "border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30" },
  { value: "damage", label: "Minor damage", emoji: "⚠️", color: "border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30" },
  { value: "wrong_parking", label: "Wrong parking", emoji: "🅿️", color: "border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/30" },
];

function vehicleEmoji(type?: string) {
  if (!type) return "🚗";
  const t = type.toLowerCase();
  if (t.includes("bike") || t.includes("motorcycle")) return "🏍️";
  if (t.includes("truck")) return "🚛";
  if (t.includes("bus")) return "🚌";
  if (t.includes("suv")) return "🚙";
  return "🚗";
}

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_PHOTO_EXT = /\.(jpe?g|png|webp)$/i;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB original file
// Cap the source-image pixel count we'll attempt to decode/resize on-device.
// Even a phone-camera photo rarely exceeds ~50 MP; rejecting bigger inputs up
// front avoids freezing weak devices on hostile or accidentally-massive files.
const MAX_PHOTO_MEGAPIXELS = 50;

async function compressPhotoToBlob(file: File, maxSize = 1280): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const megapixels = (img.width * img.height) / 1_000_000;
        if (megapixels > MAX_PHOTO_MEGAPIXELS) {
          reject(new Error(`image is too large (max ${MAX_PHOTO_MEGAPIXELS} megapixels)`));
          return;
        }
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Re-encoding through canvas also strips EXIF and any embedded
        // metadata, so what we upload is just pixel data.
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Could not encode image"));
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = e.target!.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

// Upload a compressed photo blob to object storage via a presigned PUT URL.
// Returns the object path (e.g. "/objects/uploads/<uuid>") to persist on the
// report payload.
async function uploadPhotoToStorage(blob: Blob, fileName: string): Promise<string> {
  const presigned = await requestUploadUrl({
    name: fileName,
    size: blob.size,
    contentType: blob.type || "image/jpeg",
  });
  const putRes = await fetch(presigned.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status}`);
  }
  return presigned.objectPath;
}

// Pull a user-friendly message out of an ApiError thrown by the generated
// hooks. The server returns `{ error: "..." }` for 4xx responses (e.g. photo
// rejected for being too large or the wrong dimensions). Falling back to a
// generic message keeps the UI safe if something unexpected is thrown.
function describeSubmitError(err: unknown, fallback: string): string {
  const data = (err as { data?: unknown } | null)?.data;
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function getLocation(): Promise<{ latitude: string; longitude: string; locationLabel: string } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude.toString(),
        longitude: pos.coords.longitude.toString(),
        locationLabel: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
      }),
      () => resolve(null),
      { timeout: 6000 }
    );
  });
}

// ─── Photo uploader component ─────────────────────────────────────────────────

function PhotoUploader({
  photos,
  onChange,
  max = 3,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  // Map from object-storage path → blob: URL. Lets us show the local preview
  // we just compressed without waiting for /api/storage/objects/* to be ready
  // (and avoids a redundant network round-trip).
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (loading) return; // ignore concurrent selections while we're already processing
    setLoading(true);
    const accepted: string[] = [];
    const errors: string[] = [];
    try {
      const slots = Math.max(0, max - photos.length);
      const candidates = Array.from(files).slice(0, slots);
      if (files.length > slots) {
        errors.push(`Only ${slots} more photo${slots === 1 ? "" : "s"} allowed (max ${max}).`);
      }
      for (const file of candidates) {
        const typeOk =
          ALLOWED_PHOTO_TYPES.has(file.type.toLowerCase()) || ALLOWED_PHOTO_EXT.test(file.name);
        if (!typeOk) {
          errors.push(`${file.name || "File"}: please use JPG, PNG or WEBP.`);
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          errors.push(`${file.name || "File"}: too large (max 5 MB).`);
          continue;
        }
        try {
          const blob = await compressPhotoToBlob(file);
          const objectPath = await uploadPhotoToStorage(blob, file.name || "photo.jpg");
          previewUrlsRef.current.set(objectPath, URL.createObjectURL(blob));
          accepted.push(objectPath);
        } catch (err) {
          const message = err instanceof Error ? err.message : "could not upload";
          errors.push(`${file.name || "File"}: ${message}.`);
        }
      }
      if (accepted.length) onChange([...photos, ...accepted]);
      if (errors.length) {
        toast({
          title: errors.length === 1 ? "Photo not added" : `${errors.length} photo(s) not added`,
          description: errors.join(" "),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      // Reset so the same file can be re-selected after removing it
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(idx: number) {
    const removed = photos[idx];
    const localUrl = removed ? previewUrlsRef.current.get(removed) : undefined;
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
      previewUrlsRef.current.delete(removed);
    }
    onChange(photos.filter((_, j) => j !== idx));
  }

  function previewSrc(p: string): string {
    return previewUrlsRef.current.get(p) ?? resolvePhotoSrc(p);
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            <img
              src={previewSrc(p)}
              alt={`photo ${i + 1}`}
              className="w-20 h-20 object-cover rounded-lg border"
              data-testid={`img-photo-preview-${i}`}
            />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              data-testid={`button-remove-photo-${i}`}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              onClick={() => removePhoto(i)}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            data-testid="button-add-photo"
            aria-label="Add photo"
            className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <span className="text-xs">{loading ? "Loading" : "Add"}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        JPG, PNG or WEBP · up to 5 MB each · max {max} photo{max === 1 ? "" : "s"}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        data-testid="input-photo-upload"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ─── SOS Modal ────────────────────────────────────────────────────────────────

function SosModal({ qrCode, open, onClose }: { qrCode: string; open: boolean; onClose: () => void }) {
  const { data: sos, isLoading, error } = useGetPublicSos(qrCode, {
    query: { enabled: open, retry: false, queryKey: getGetPublicSosQueryKey(qrCode) },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <HeartPulse className="w-5 h-5" />
            Emergency Information
          </DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
        {error && (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No emergency profile set up for this vehicle.</p>
          </div>
        )}
        {sos && (
          <div className="space-y-4">
            {sos.bloodGroup && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl">
                <Droplets className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Blood Group</p>
                  <p className="font-bold text-red-600 text-lg">{sos.bloodGroup}</p>
                </div>
              </div>
            )}
            {sos.medicalNotes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Medical Notes</p>
                <p className="text-sm font-medium">{sos.medicalNotes}</p>
              </div>
            )}
            {sos.emergencyContactName && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emergency Contacts</p>
                <div className="border rounded-xl p-3 space-y-1">
                  <p className="font-medium text-sm">{sos.emergencyContactName}</p>
                  {sos.emergencyPhone && (
                    <a href={`tel:${sos.emergencyPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <PhoneCall className="w-3.5 h-3.5" />
                      {sos.emergencyPhone}
                    </a>
                  )}
                </div>
                {sos.altContactName && (
                  <div className="border rounded-xl p-3 space-y-1">
                    <p className="font-medium text-sm">{sos.altContactName}</p>
                    {sos.altContactPhone && (
                      <a href={`tel:${sos.altContactPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <PhoneCall className="w-3.5 h-3.5" />
                        {sos.altContactPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Alert ───────────────────────────────────────────────────────────────

function AlertTab({ qrCode }: { qrCode: string }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const sendAlert = useSendPublicAlert();

  function handleSend() {
    if (!selected) {
      toast({ title: "Please select an alert type", variant: "destructive" });
      return;
    }
    sendAlert.mutate({ qrCode: qrCode!, data: { alertType: selected, message } }, {
      onSuccess: () => setSent(true),
      onError: () => toast({ title: "Failed to send alert", description: "Please try again.", variant: "destructive" }),
    });
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="p-10 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold">Alert Sent!</h2>
          <p className="text-muted-foreground text-sm">The car owner has been notified. They should respond shortly.</p>
          <Button variant="outline" onClick={() => { setSent(false); setSelected(""); setMessage(""); }} data-testid="button-send-another">
            Send Another Alert
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold mb-3">Select alert type:</p>
        <div className="grid grid-cols-2 gap-2">
          {alertTypes.map((at) => (
            <button
              key={at.value}
              onClick={() => setSelected(at.value)}
              data-testid={`alert-type-${at.value}`}
              className={cn(
                "border rounded-xl p-3 text-left transition-all",
                at.color,
                selected === at.value ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-1" : ""
              )}
            >
              <div className="text-xl mb-1">{at.emoji}</div>
              <div className="text-xs font-medium text-foreground">{at.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Additional message (optional)</Label>
        <Textarea
          placeholder="Add more details about the situation..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="textarea-message"
        />
      </div>
      <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
        <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">Your identity and location are not shared with the car owner. This alert is sent anonymously.</p>
      </div>
      <Button className="w-full" size="lg" onClick={handleSend} disabled={!selected || sendAlert.isPending} data-testid="button-send-alert">
        {sendAlert.isPending ? "Sending..." : "Send Alert to Owner"}
      </Button>
    </div>
  );
}

// ─── Tab: Report Accident ─────────────────────────────────────────────────────

function AccidentTab({ qrCode }: { qrCode: string }) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: string; longitude: string; locationLabel: string } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = useSubmitAccidentReport();

  async function fetchLocation() {
    setFetchingLocation(true);
    const loc = await getLocation();
    setFetchingLocation(false);
    if (loc) setLocation(loc);
    else toast({ title: "Could not get location", description: "Please allow location access or skip.", variant: "destructive" });
  }

  function handleSubmit() {
    if (!description.trim()) {
      toast({ title: "Please describe the accident", variant: "destructive" });
      return;
    }
    submit.mutate(
      { qrCode: qrCode!, data: { description, photos, ...location } },
      {
        onSuccess: () => setSent(true),
        onError: (err) =>
          toast({
            title: "Failed to submit report",
            description: describeSubmitError(err, "Please try again."),
            variant: "destructive",
          }),
      }
    );
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="p-10 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold">Report Submitted</h2>
          <p className="text-muted-foreground text-sm">The vehicle owner has been notified. Thank you for being a responsible witness.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <p className="text-sm text-orange-800 dark:text-orange-200">
          Use this form to notify the vehicle owner about an accident involving their vehicle. Your report will be sent directly to them.
        </p>
      </div>

      <div>
        <Label className="mb-2 block font-semibold">What happened? <span className="text-red-500">*</span></Label>
        <Textarea
          placeholder="Describe the accident — damage, what happened, approximate time..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="resize-none"
          rows={4}
          data-testid="textarea-accident-description"
        />
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Photos <span className="text-muted-foreground font-normal">(optional, up to 3)</span></Label>
        <PhotoUploader photos={photos} onChange={setPhotos} max={3} />
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
        {location ? (
          <div className="flex items-center gap-2 text-sm bg-muted rounded-xl p-3">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="flex-1 truncate">{location.locationLabel}</span>
            <button onClick={() => setLocation(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={fetchLocation} disabled={fetchingLocation} className="gap-2">
            {fetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {fetchingLocation ? "Getting location..." : "Add My Location"}
          </Button>
        )}
      </div>

      <Button
        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        size="lg"
        onClick={handleSubmit}
        disabled={submit.isPending || !description.trim()}
        data-testid="button-submit-accident"
      >
        {submit.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
        ) : (
          <><AlertTriangle className="w-4 h-4 mr-2" />Submit Accident Report</>
        )}
      </Button>
    </div>
  );
}

// ─── Tab: Found Keys ──────────────────────────────────────────────────────────

function FoundKeysTab({ qrCode }: { qrCode: string }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [finderContact, setFinderContact] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: string; longitude: string; locationLabel: string } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = useSubmitLostItem();

  async function fetchLocation() {
    setFetchingLocation(true);
    const loc = await getLocation();
    setFetchingLocation(false);
    if (loc) setLocation(loc);
    else toast({ title: "Could not get location", description: "Please allow location access or skip.", variant: "destructive" });
  }

  function handleSubmit() {
    if (!message.trim()) {
      toast({ title: "Please write a message", variant: "destructive" });
      return;
    }
    submit.mutate(
      { qrCode: qrCode!, data: { message, photos, finderContact: finderContact || undefined, ...location } },
      {
        onSuccess: () => setSent(true),
        onError: (err) =>
          toast({
            title: "Failed to submit",
            description: describeSubmitError(err, "Please try again."),
            variant: "destructive",
          }),
      }
    );
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="p-10 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold">Message Sent!</h2>
          <p className="text-muted-foreground text-sm">The vehicle owner has been notified. They will contact you soon. Thank you for your kindness!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          Found this vehicle's keys or items? Let the owner know — your message will be sent directly to them via the QR system.
        </p>
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Your message <span className="text-red-500">*</span></Label>
        <Textarea
          placeholder="e.g. Found your keys near Gate 3 of Phoenix Mall. I've handed them to security. Contact me at..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={4}
          data-testid="textarea-found-message"
        />
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Your contact <span className="text-muted-foreground font-normal">(optional but recommended)</span></Label>
        <Input
          placeholder="Phone number or email so the owner can reach you"
          value={finderContact}
          onChange={(e) => setFinderContact(e.target.value)}
          data-testid="input-finder-contact"
        />
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Photos <span className="text-muted-foreground font-normal">(optional, up to 2)</span></Label>
        <PhotoUploader photos={photos} onChange={setPhotos} max={2} />
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Location where found <span className="text-muted-foreground font-normal">(optional)</span></Label>
        {location ? (
          <div className="flex items-center gap-2 text-sm bg-muted rounded-xl p-3">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="flex-1 truncate">{location.locationLabel}</span>
            <button onClick={() => setLocation(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={fetchLocation} disabled={fetchingLocation} className="gap-2">
            {fetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {fetchingLocation ? "Getting location..." : "Add Current Location"}
          </Button>
        )}
      </div>

      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        size="lg"
        onClick={handleSubmit}
        disabled={submit.isPending || !message.trim()}
        data-testid="button-submit-found-keys"
      >
        {submit.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
        ) : (
          <><KeyRound className="w-4 h-4 mr-2" />Send Message to Owner</>
        )}
      </Button>
    </div>
  );
}

// ─── Main Scan Page ───────────────────────────────────────────────────────────

type TabId = "alert" | "accident" | "keys";

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "alert", label: "Alert", emoji: "📣" },
  { id: "accident", label: "Accident", emoji: "🚨" },
  { id: "keys", label: "Found Keys", emoji: "🔑" },
];

export default function ScanPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [tab, setTab] = useState<TabId>("alert");
  const [sosOpen, setSosOpen] = useState(false);

  const { data: vehicle, isLoading, error } = useGetPublicVehicle(qrCode!, {
    query: { retry: false, queryKey: getGetPublicVehicleQueryKey(qrCode!) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">MyCarQR</span>
            </div>
          </div>
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold">QR Code Not Found</h2>
              <p className="text-muted-foreground text-sm">Vehicle QR not found or disabled.</p>
              <p className="text-xs text-muted-foreground">The owner may have disabled this QR code, or the link is incorrect.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-cyan-400" />
            <span className="font-bold">MyCarQR</span>
          </div>

          {/* Vehicle info */}
          <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
              {vehicleEmoji(vehicle.vehicleType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg tracking-wide" data-testid="text-vehicle-number">
                  {vehicle.vehicleNumber}
                </h3>
                {vehicle.privacyMode && (
                  <Badge variant="outline" className="text-xs border-white/30 text-white">
                    <Shield className="w-3 h-3 mr-1" />Privacy
                  </Badge>
                )}
              </div>
              {!vehicle.privacyMode && (vehicle.brand || vehicle.model) ? (
                <p className="text-sm text-blue-200 mt-0.5">
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
                  {vehicle.color ? ` · ${vehicle.color}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          {/* Contact + Emergency row */}
          <div className="flex gap-2">
            {vehicle.primaryContact && (
              <a href={`tel:${vehicle.primaryContact}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full bg-white/15 hover:bg-white/25 text-white border-0 gap-1.5" data-testid="button-call-owner">
                  <Phone className="w-3.5 h-3.5" />Call
                </Button>
              </a>
            )}
            {vehicle.whatsappNumber && (
              <a href={`https://wa.me/${vehicle.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full bg-green-600/70 hover:bg-green-600/90 text-white border-0 gap-1.5" data-testid="button-whatsapp-owner">
                  <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                </Button>
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSosOpen(true)}
              className="bg-red-600/70 hover:bg-red-600/90 text-white border-0 gap-1.5"
              data-testid="button-emergency-sos"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Emergency</span>
              <span className="sm:hidden">SOS</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4">
        <div className="flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                tab === t.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-base">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-md mx-auto px-4 py-5">
        {tab === "alert" && <AlertTab qrCode={qrCode!} />}
        {tab === "accident" && <AccidentTab qrCode={qrCode!} />}
        {tab === "keys" && <FoundKeysTab qrCode={qrCode!} />}

        <p className="text-center text-xs text-muted-foreground pt-6 pb-4">
          Powered by{" "}
          <a href="/" className="font-semibold text-primary hover:underline">MyCarQR</a>
          {" "}— Smart QR for every vehicle
        </p>
      </div>

      <SosModal qrCode={qrCode!} open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
