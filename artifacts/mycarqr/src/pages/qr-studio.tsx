import { useEffect, useRef, useState, useCallback, forwardRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetVehicle, getGetVehicleQueryKey,
  useGetQrSettings,
} from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, FileText, Save, Printer, Lock, Crown,
  Sparkles, Car, Phone, Shield, AlertTriangle, Key, Users,
  Layers, CheckCircle2, Star, Zap, Smartphone, Eye, Package,
} from "lucide-react";
import { STICKER_DESIGNS, generateStickerPDF, type StickerDesign } from "@/lib/sticker-pdf";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ──────────────────────────────────────────────────────────────────

type StickerSizeId = "dashboard" | "windshield" | "rear" | "wallet";
type FontWeight = "normal" | "bold" | "black";
type PreviewMode = "sticker" | "mobile" | "car";

interface DesignConfig {
  templateId: string;
  vehicleLabel: string;
  customTitle: string;
  bg: string;
  textColor: string;
  accentColor: string;
  qrDark: string;
  qrLight: string;
  borderRadius: number;
  showShadow: boolean;
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
  fontWeight: FontWeight;
  stickerSize: StickerSizeId;
  showBranding: boolean;
  showFeatureIcons: boolean;
}

// ─── Template Definitions ───────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  isPremium: boolean;
  config: Partial<DesignConfig>;
  previewBg: string;
  previewAccent: string;
  previewText: string;
  description: string;
}

const ALL_TEMPLATES: Template[] = [
  {
    id: "minimal-white",
    name: "Minimal White",
    isPremium: false,
    description: "Clean, minimal white",
    previewBg: "#f8fafc",
    previewAccent: "#1a3a6e",
    previewText: "#1a3a6e",
    config: {
      bg: "#f8fafc",
      textColor: "#0f172a",
      accentColor: "#1a3a6e",
      qrDark: "#1a3a6e",
      qrLight: "#f8fafc",
      borderRadius: 14,
      showBorder: true,
      borderColor: "#1a3a6e",
      borderWidth: 2,
      showShadow: false,
    },
  },
  {
    id: "classic-black-gold",
    name: "Classic Black & Gold",
    isPremium: false,
    description: "Timeless black with gold luxury",
    previewBg: "#0a0a0a",
    previewAccent: "#d4a017",
    previewText: "#d4a017",
    config: {
      bg: "linear-gradient(160deg,#0a0a0a 0%,#1c1c1c 100%)",
      textColor: "#d4a017",
      accentColor: "#d4a017",
      qrDark: "#d4a017",
      qrLight: "#0a0a0a",
      borderRadius: 14,
      showBorder: true,
      borderColor: "#d4a017",
      borderWidth: 2,
      showShadow: true,
    },
  },
  {
    id: "sporty-red",
    name: "Sporty Red",
    isPremium: true,
    description: "Bold red for sports cars",
    previewBg: "#1a0000",
    previewAccent: "#ff3333",
    previewText: "#ffffff",
    config: {
      bg: "linear-gradient(160deg,#1a0000 0%,#3d0000 100%)",
      textColor: "#ffffff",
      accentColor: "#ff4444",
      qrDark: "#ff4444",
      qrLight: "#1a0000",
      borderRadius: 10,
      showBorder: true,
      borderColor: "#ff3333",
      borderWidth: 2,
      showShadow: true,
    },
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    isPremium: true,
    description: "Regal gold for premium vehicles",
    previewBg: "#2d1e00",
    previewAccent: "#f5c542",
    previewText: "#2d1e00",
    config: {
      bg: "linear-gradient(160deg,#2d1e00 0%,#4a3200 50%,#2d1e00 100%)",
      textColor: "#f5c542",
      accentColor: "#f5c542",
      qrDark: "#f5c542",
      qrLight: "#2d1e00",
      borderRadius: 16,
      showBorder: true,
      borderColor: "#f5c542",
      borderWidth: 2,
      showShadow: true,
    },
  },
  {
    id: "neon-blue",
    name: "Neon Blue",
    isPremium: true,
    description: "Electric blue for tech lovers",
    previewBg: "#030318",
    previewAccent: "#00b4ff",
    previewText: "#ffffff",
    config: {
      bg: "linear-gradient(160deg,#030318 0%,#0d1a40 100%)",
      textColor: "#ffffff",
      accentColor: "#00b4ff",
      qrDark: "#00b4ff",
      qrLight: "#030318",
      borderRadius: 16,
      showBorder: true,
      borderColor: "#00b4ff60",
      borderWidth: 1,
      showShadow: true,
    },
  },
  {
    id: "army-green",
    name: "Army Green",
    isPremium: true,
    description: "Rugged military style",
    previewBg: "#1a2410",
    previewAccent: "#7ab648",
    previewText: "#b5d08a",
    config: {
      bg: "linear-gradient(160deg,#1a2410 0%,#283618 100%)",
      textColor: "#b5d08a",
      accentColor: "#7ab648",
      qrDark: "#7ab648",
      qrLight: "#1a2410",
      borderRadius: 8,
      showBorder: true,
      borderColor: "#7ab64880",
      borderWidth: 2,
      showShadow: true,
    },
  },
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    isPremium: true,
    description: "Professional fleet look",
    previewBg: "#0a1628",
    previewAccent: "#4fc3f7",
    previewText: "#ffffff",
    config: {
      bg: "linear-gradient(160deg,#0a1628 0%,#1e3a5f 100%)",
      textColor: "#ffffff",
      accentColor: "#4fc3f7",
      qrDark: "#4fc3f7",
      qrLight: "#0a1628",
      borderRadius: 8,
      showBorder: false,
      borderColor: "#4fc3f7",
      borderWidth: 1,
      showShadow: true,
    },
  },
  {
    id: "emergency-red",
    name: "Emergency Red",
    isPremium: true,
    description: "High-visibility emergency sticker",
    previewBg: "#b71c1c",
    previewAccent: "#ffffff",
    previewText: "#ffffff",
    config: {
      bg: "linear-gradient(160deg,#b71c1c 0%,#c62828 100%)",
      textColor: "#ffffff",
      accentColor: "#ffcdd2",
      qrDark: "#ffffff",
      qrLight: "#b71c1c",
      borderRadius: 12,
      showBorder: true,
      borderColor: "#ffffff",
      borderWidth: 3,
      showShadow: true,
    },
  },
];

// ─── Sticker Sizes ──────────────────────────────────────────────────────────

const STICKER_SIZES: Record<StickerSizeId, { label: string; desc: string; w: number; h: number }> = {
  dashboard: { label: "Dashboard", desc: "6×6 cm", w: 280, h: 340 },
  windshield: { label: "Windshield", desc: "10×12 cm", w: 320, h: 400 },
  rear: { label: "Rear Glass", desc: "15×8 cm", w: 420, h: 240 },
  wallet: { label: "Wallet Card", desc: "8.5×5.4 cm", w: 380, h: 220 },
};

// ─── Feature Icons ───────────────────────────────────────────────────────────

const FEATURE_ICONS = [
  { icon: Phone, label: "Contact" },
  { icon: Shield, label: "SOS" },
  { icon: AlertTriangle, label: "Accident" },
  { icon: Key, label: "Lost & Found" },
  { icon: Car, label: "Multi-Vehicle" },
  { icon: Lock, label: "Privacy Safe" },
] as const;

// ─── Default config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DesignConfig = {
  templateId: "minimal-white",
  vehicleLabel: "",
  customTitle: "",
  bg: "#f8fafc",
  textColor: "#0f172a",
  accentColor: "#1a3a6e",
  qrDark: "#1a3a6e",
  qrLight: "#f8fafc",
  borderRadius: 14,
  showShadow: false,
  showBorder: true,
  borderColor: "#1a3a6e",
  borderWidth: 2,
  fontWeight: "bold",
  stickerSize: "dashboard",
  showBranding: true,
  showFeatureIcons: true,
};

// ─── Sticker Preview Component ───────────────────────────────────────────────

interface StickerPreviewProps {
  config: DesignConfig;
  qrDataUrl: string;
  brandName: string;
  tagline: string;
  ctaText: string;
}

const StickerPreview = forwardRef<HTMLDivElement, StickerPreviewProps>(
  ({ config, qrDataUrl, brandName, tagline, ctaText }, ref) => {
    const size = STICKER_SIZES[config.stickerSize];
    const isLandscape = size.w > size.h;
    const fw = config.fontWeight === "black" ? 900 : config.fontWeight === "bold" ? 700 : 400;
    const qrSize = isLandscape
      ? Math.min(size.h - 64, 150)
      : Math.min(size.w - 64, size.h * 0.42, 160);
    const displayTitle = config.customTitle || tagline;

    const containerStyle: React.CSSProperties = {
      width: size.w,
      height: size.h,
      background: config.bg,
      borderRadius: config.borderRadius,
      border: config.showBorder ? `${config.borderWidth}px solid ${config.borderColor}` : "none",
      boxShadow: config.showShadow ? `0 8px 40px ${config.accentColor}50, 0 2px 12px rgba(0,0,0,0.3)` : "none",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: "relative",
      boxSizing: "border-box",
    };

    if (isLandscape) {
      return (
        <div ref={ref} style={containerStyle}>
          {/* Top accent bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)` }} />

          {/* Main content row */}
          <div style={{ flex: 1, display: "flex", flexDirection: "row", alignItems: "center", padding: "12px 20px", gap: 16 }}>
            {/* Left: branding + text */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              {/* Brand */}
              <div style={{ fontSize: 18, fontWeight: 900, color: config.accentColor, letterSpacing: "0.04em" }}>
                {brandName}
              </div>
              {/* Vehicle number */}
              {config.vehicleLabel && (
                <div style={{ fontSize: 20, fontWeight: 900, color: config.textColor, letterSpacing: "0.1em" }}>
                  {config.vehicleLabel}
                </div>
              )}
              {/* Tagline */}
              <div style={{ fontSize: 9, color: config.textColor, opacity: 0.7, lineHeight: 1.4 }}>
                {displayTitle}
              </div>
              {/* Feature mini-list */}
              {config.showFeatureIcons && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 4 }}>
                  {FEATURE_ICONS.map(({ label }) => (
                    <div key={label} style={{ fontSize: 8, color: config.accentColor, opacity: 0.8, display: "flex", alignItems: "center", gap: 2 }}>
                      <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: config.accentColor }} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
              {config.showBranding && (
                <div style={{ fontSize: 8, color: config.textColor, opacity: 0.35, marginTop: 2 }}>mycarqr.in</div>
              )}
            </div>

            {/* Right: QR block */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{
                background: config.qrLight || "#fff",
                borderRadius: config.borderRadius * 0.4,
                padding: 6,
                border: `1.5px solid ${config.accentColor}40`,
              }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR" style={{ width: qrSize, height: qrSize, display: "block" }} />
                  : <div style={{ width: qrSize, height: qrSize, background: `repeating-linear-gradient(45deg, ${config.qrDark}20 0px, ${config.qrDark}20 4px, transparent 4px, transparent 8px)` }} />
                }
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: config.accentColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                ▶ {ctaText}
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${config.accentColor}60, transparent)` }} />
        </div>
      );
    }

    // Portrait layout
    return (
      <div ref={ref} style={containerStyle}>
        {/* Top accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)` }} />

        {/* Brand header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 6px",
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: config.accentColor, letterSpacing: "0.04em" }}>
            {brandName}
          </div>
          {config.vehicleLabel && (
            <div style={{
              fontSize: 12,
              fontWeight: 900,
              color: config.accentColor,
              letterSpacing: "0.08em",
              padding: "2px 8px",
              border: `1.5px solid ${config.accentColor}70`,
              borderRadius: 4,
            }}>
              {config.vehicleLabel}
            </div>
          )}
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 10,
          color: config.textColor,
          opacity: 0.75,
          textAlign: "center",
          padding: "0 12px 8px",
          fontWeight: fw,
          letterSpacing: "0.02em",
        }}>
          {displayTitle}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `${config.accentColor}30`, margin: "0 14px" }} />

        {/* QR Code center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 16px 6px", gap: 6 }}>
          <div style={{
            background: config.qrLight || "#fff",
            borderRadius: config.borderRadius * 0.5,
            padding: 8,
            border: `2px solid ${config.accentColor}50`,
            boxShadow: `0 0 20px ${config.accentColor}20`,
          }}>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR" style={{ width: qrSize, height: qrSize, display: "block" }} />
              : <div style={{ width: qrSize, height: qrSize, background: `repeating-linear-gradient(45deg, ${config.qrDark}20 0px, ${config.qrDark}20 4px, transparent 4px, transparent 8px)`, borderRadius: 4 }} />
            }
          </div>

          {/* CTA */}
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: config.accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            padding: "3px 12px",
            border: `1px solid ${config.accentColor}60`,
            borderRadius: 99,
          }}>
            ▶ {ctaText}
          </div>
        </div>

        {/* Feature icons strip */}
        {config.showFeatureIcons && (
          <>
            <div style={{ height: 1, background: `${config.accentColor}20`, margin: "0 14px" }} />
            <div style={{ display: "flex", justifyContent: "space-around", padding: "6px 8px", flexWrap: "wrap", gap: 2 }}>
              {FEATURE_ICONS.map(({ label }) => (
                <div key={label} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  fontSize: 7,
                  color: config.accentColor,
                  opacity: 0.85,
                  minWidth: 36,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: `${config.accentColor}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: config.accentColor, opacity: 0.7 }} />
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ height: 1, background: `${config.accentColor}20`, margin: "0 14px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 14px" }}>
          {config.showBranding && (
            <div style={{ fontSize: 8, color: config.textColor, opacity: 0.35, letterSpacing: "0.06em" }}>
              mycarqr.in
            </div>
          )}
        </div>
      </div>
    );
  }
);
StickerPreview.displayName = "StickerPreview";

// ─── Mini Template Card ──────────────────────────────────────────────────────

function TemplateCard({
  template, isSelected, isPremiumUser, isEnabled, onClick,
}: {
  template: Template;
  isSelected: boolean;
  isPremiumUser: boolean;
  isEnabled: boolean;
  onClick: () => void;
}) {
  const locked = template.isPremium && !isPremiumUser;
  const disabled = !isEnabled;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.04 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={cn(
        "relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
        isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-muted-foreground/30",
        disabled && "opacity-40 cursor-not-allowed"
      )}
      style={{ width: 96, height: 124 }}
      disabled={disabled}
    >
      {/* Mini preview */}
      <div className="absolute inset-0 flex flex-col gap-1 p-2" style={{ background: template.previewBg }}>
        {/* Brand bar */}
        <div className="text-[7px] font-black" style={{ color: template.previewAccent }}>MyCarQR</div>
        {/* QR placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded" style={{
            width: 40, height: 40,
            background: `repeating-linear-gradient(45deg, ${template.previewAccent} 0, ${template.previewAccent} 2px, ${template.previewBg} 2px, ${template.previewBg} 5px)`,
            border: `1.5px solid ${template.previewAccent}80`,
          }} />
        </div>
        {/* CTA line */}
        <div className="text-[6px] text-center font-bold tracking-widest" style={{ color: template.previewAccent }}>SCAN</div>
        {/* Feature dots */}
        <div className="flex justify-center gap-0.5">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded-full" style={{ width: 4, height: 4, background: template.previewAccent, opacity: 0.5 }} />
          ))}
        </div>
      </div>

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1 backdrop-blur-[1px]">
          <Lock className="w-4 h-4 text-yellow-400" />
          <Crown className="w-3 h-3 text-yellow-400" />
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-semibold text-center py-1 px-1 leading-tight">
        {template.name}
      </div>

      {isSelected && (
        <div className="absolute top-1 left-1">
          <CheckCircle2 className="w-4 h-4 text-primary fill-white" />
        </div>
      )}
    </motion.button>
  );
}

// ─── Upgrade Dialog ──────────────────────────────────────────────────────────

function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-sm" aria-describedby={undefined}>
            <DialogHeader>
              <div className="flex items-center justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Unlock Premium Designs</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">
                Get all premium sticker themes — Sporty Red, Royal Gold, Neon Blue, Army Green &amp; more. Print-ready for any vehicle.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-left">
                {[
                  "6 premium themes", "PDF print-ready", "Car-body preview",
                  "Feature icons", "Custom branding", "HD download"
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Link href="/payment">
                  <Button
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0"
                    onClick={onClose}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Premium — ₹99/mo
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full" onClick={onClose}>Maybe later</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

// ─── Car-body mockup ─────────────────────────────────────────────────────────

function CarMockup({ stickerPng }: { stickerPng: string | null }) {
  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      {/* Simple SVG car silhouette */}
      <svg viewBox="0 0 400 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <rect x="30" y="110" width="340" height="80" rx="18" fill="#1e293b" />
        {/* Roof */}
        <path d="M100 110 Q130 50 180 42 Q230 36 280 42 Q320 50 340 110 Z" fill="#1e293b" />
        {/* Windshield */}
        <path d="M115 108 Q140 60 183 52 Q225 45 270 52 Q308 60 325 108 Z" fill="#334155" opacity="0.8" />
        {/* Side window */}
        <path d="M148 108 Q160 68 185 60 Q215 54 250 60 Q275 68 285 108 Z" fill="#475569" opacity="0.6" />
        {/* Wheels */}
        <circle cx="110" cy="190" r="30" fill="#0f172a" stroke="#475569" strokeWidth="4" />
        <circle cx="110" cy="190" r="16" fill="#1e293b" />
        <circle cx="290" cy="190" r="30" fill="#0f172a" stroke="#475569" strokeWidth="4" />
        <circle cx="290" cy="190" r="16" fill="#1e293b" />
        {/* Headlights */}
        <rect x="34" y="122" width="24" height="10" rx="3" fill="#fbbf24" opacity="0.9" />
        <rect x="342" y="122" width="24" height="10" rx="3" fill="#ef4444" opacity="0.7" />
      </svg>
      {/* Sticker overlay on windshield */}
      {stickerPng && (
        <div className="absolute" style={{ top: "22%", left: "50%", transform: "translateX(-50%)", width: "22%" }}>
          <img src={stickerPng} alt="sticker preview" className="w-full rounded shadow-lg opacity-90" />
        </div>
      )}
    </div>
  );
}

// ─── Main QR Studio Page ─────────────────────────────────────────────────────

export default function QrStudio() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = parseInt(id!);
  const { data: me } = useGetMe();
  const { toast } = useToast();

  const { data: vehicle } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId, queryKey: getGetVehicleQueryKey(vehicleId) }
  });
  const { data: qrSettingsData } = useGetQrSettings();

  const isPremiumUser = me?.plan === "premium";
  const brandName = qrSettingsData?.brandName ?? "MyCarQR";
  const tagline = qrSettingsData?.tagline ?? "Scan. Connect. Stay Safe.";
  const ctaText = qrSettingsData?.ctaText ?? "Scan to Connect";
  const enabledThemes = (qrSettingsData?.enabledThemes as string[] | undefined) ?? ALL_TEMPLATES.map(t => t.id);
  const premiumThemeIds = (qrSettingsData?.premiumThemes as string[] | undefined) ?? ALL_TEMPLATES.filter(t => t.isPremium).map(t => t.id);

  const TEMPLATES = ALL_TEMPLATES.filter(t => enabledThemes.includes(t.id)).map(t => ({
    ...t,
    isPremium: premiumThemeIds.includes(t.id),
  }));

  const scanUrl = vehicle?.qrCode
    ? `${window.location.origin}${basePath}/scan/${vehicle.qrCode}`
    : `${window.location.origin}${basePath}/scan/demo`;

  const [config, setConfig] = useState<DesignConfig>(() => ({
    ...DEFAULT_CONFIG,
    vehicleLabel: vehicle?.vehicleNumber ?? "",
  }));
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [carStickerPng, setCarStickerPng] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStickerExporting, setIsStickerExporting] = useState<StickerDesign | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("sticker");
  const [savedDesigns, setSavedDesigns] = useState<Array<DesignConfig & { savedId: number; savedAt: string }>>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vehicle?.vehicleNumber) {
      setConfig(c => ({ ...c, vehicleLabel: vehicle.vehicleNumber }));
    }
  }, [vehicle?.vehicleNumber]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mcqr_designs_${vehicleId}`) || "[]");
      setSavedDesigns(saved);
    } catch { /* ignore */ }
  }, [vehicleId]);

  useEffect(() => {
    if (!scanUrl) return;
    QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: { dark: config.qrDark, light: config.qrLight },
      errorCorrectionLevel: "H",
    }).then(setQrDataUrl).catch(() => { });
  }, [scanUrl, config.qrDark, config.qrLight]);

  // Auto-generate car sticker PNG when in car mode
  useEffect(() => {
    if (previewMode !== "car" || !previewRef.current || !qrDataUrl) return;
    const timer = setTimeout(async () => {
      try {
        const png = await toPng(previewRef.current!, { pixelRatio: 2 });
        setCarStickerPng(png);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [previewMode, qrDataUrl, config]);

  const update = useCallback(<K extends keyof DesignConfig>(key: K, value: DesignConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
  }, []);

  function applyTemplate(template: Template) {
    if (template.isPremium && !isPremiumUser) {
      setShowUpgrade(true);
      return;
    }
    setConfig(c => ({ ...c, ...template.config, templateId: template.id }));
    toast({ title: `Applied: ${template.name}` });
  }

  async function exportPng() {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement("a");
      link.download = `mycarqr-${config.vehicleLabel || "sticker"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "PNG downloaded!" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  async function exportPdf() {
    if (!previewRef.current) return;
    if (!isPremiumUser) { setShowUpgrade(true); return; }
    setIsExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, { pixelRatio: 4, cacheBust: true });
      const size = STICKER_SIZES[config.stickerSize];
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const scale = Math.min((pdfW - 40) / size.w, (pdfH - 40) / size.h);
      const imgW = size.w * scale;
      const imgH = size.h * scale;
      const x = (pdfW - imgW) / 2;
      const y = (pdfH - imgH) / 2;
      pdf.addImage(dataUrl, "PNG", x, y, imgW, imgH);
      pdf.save(`mycarqr-${config.vehicleLabel || "sticker"}.pdf`);
      toast({ title: "PDF downloaded!" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  async function exportStickerPdf(designId: StickerDesign) {
    if (!scanUrl) return;
    if (!isPremiumUser) { setShowUpgrade(true); return; }
    setIsStickerExporting(designId);
    try {
      const design = STICKER_DESIGNS.find(d => d.id === designId)!;
      await generateStickerPDF(design, scanUrl, config.vehicleLabel || vehicle?.vehicleNumber || "MY-VEHICLE");
      toast({ title: "Sticker PDF downloaded!", description: `${design.name} sticker ready to print.` });
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsStickerExporting(null);
    }
  }

  function saveDesign() {
    const savedDesign = { ...config, savedId: Date.now(), savedAt: new Date().toISOString() };
    const updated = [savedDesign, ...savedDesigns].slice(0, 6);
    setSavedDesigns(updated);
    localStorage.setItem(`mcqr_designs_${vehicleId}`, JSON.stringify(updated));
    toast({ title: "Design saved!" });
  }

  function loadSavedDesign(d: DesignConfig & { savedId: number; savedAt: string }) {
    const { savedId: _sid, savedAt: _sat, ...rest } = d;
    setConfig({ ...rest });
    toast({ title: "Design loaded" });
  }

  const previewSize = STICKER_SIZES[config.stickerSize];
  const MAX_PREVIEW = 320;
  const previewScale = Math.min(MAX_PREVIEW / previewSize.w, MAX_PREVIEW / previewSize.h, 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Link href={`/vehicles/${vehicleId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            QR Design Studio
          </h1>
          {vehicle && (
            <p className="text-xs text-muted-foreground truncate">{vehicle.vehicleNumber} · {vehicle.brand} {vehicle.model}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isPremiumUser && (
            <Link href="/pricing">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 gap-1 cursor-pointer">
                <Crown className="w-3 h-3" />Premium
              </Badge>
            </Link>
          )}
          <Button size="sm" variant="outline" onClick={saveDesign} className="hidden sm:flex gap-1">
            <Save className="w-3.5 h-3.5" />Save
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row-reverse gap-0 lg:h-[calc(100vh-57px)]">
        {/* ── Right Panel: Preview ───────────────────────── */}
        <div className="flex-1 flex flex-col items-center lg:overflow-y-auto bg-muted/30 p-3 sm:p-4 gap-4 sm:gap-5">
          {/* Preview mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 self-center">
            {([
              { mode: "sticker" as PreviewMode, icon: <Layers className="w-3.5 h-3.5" />, label: "Sticker" },
              { mode: "mobile" as PreviewMode, icon: <Smartphone className="w-3.5 h-3.5" />, label: "Mobile" },
              { mode: "car" as PreviewMode, icon: <Car className="w-3.5 h-3.5" />, label: "Car" },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  previewMode === mode ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Sticker preview (always rendered for export ref, hidden in other modes) */}
          <div className={cn("space-y-3 w-full flex flex-col items-center", previewMode !== "sticker" && previewMode !== "mobile" && "hidden")}>
            {previewMode === "sticker" && (
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Live Preview</span>
                <Badge variant="secondary" className="text-xs">{STICKER_SIZES[config.stickerSize].label}</Badge>
              </div>
            )}
            {previewMode === "mobile" && (
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Mobile Preview</span>
                <Badge variant="secondary" className="text-xs">Phone screen</Badge>
              </div>
            )}

            {previewMode === "mobile" ? (
              /* Mobile phone frame */
              <div className="relative mx-auto" style={{ width: 240 }}>
                <div className="rounded-3xl border-4 border-slate-700 bg-slate-800 p-2 shadow-2xl">
                  <div className="rounded-2xl bg-white overflow-hidden">
                    <div className="bg-slate-700 h-5 flex items-center justify-center">
                      <div className="w-12 h-1.5 rounded-full bg-slate-500" />
                    </div>
                    <div className="p-2 bg-gray-50 flex flex-col items-center gap-1">
                      <div className="text-[8px] text-gray-400 font-medium">mycarqr.in/scan/...</div>
                      <div style={{ transform: `scale(${160 / previewSize.w})`, transformOrigin: "top center", marginBottom: (160 / previewSize.w - 1) * previewSize.h }}>
                        <StickerPreview
                          ref={previewRef}
                          config={config}
                          qrDataUrl={qrDataUrl}
                          brandName={brandName}
                          tagline={tagline}
                          ctaText={ctaText}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Sticker on checkered background */
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  backgroundImage: "repeating-conic-gradient(#e2e8f0 0% 25%, white 0% 50%)",
                  backgroundSize: "16px 16px",
                  padding: 20,
                }}
              >
                <motion.div
                  key={config.templateId + config.stickerSize}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
                >
                  <StickerPreview
                    ref={previewRef}
                    config={config}
                    qrDataUrl={qrDataUrl}
                    brandName={brandName}
                    tagline={tagline}
                    ctaText={ctaText}
                  />
                </motion.div>
              </div>
            )}
          </div>

          {/* Car mockup mode — hidden ref for export, visible car */}
          {previewMode === "car" && (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 justify-center">
                <Car className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Car-Body Mockup</span>
              </div>
              {/* Hidden render for capture */}
              <div className="absolute opacity-0 pointer-events-none" style={{ left: -9999 }}>
                <StickerPreview
                  ref={previewRef}
                  config={config}
                  qrDataUrl={qrDataUrl}
                  brandName={brandName}
                  tagline={tagline}
                  ctaText={ctaText}
                />
              </div>
              <CarMockup stickerPng={carStickerPng} />
              <p className="text-xs text-muted-foreground text-center">Sticker placed on windshield</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Scan URL: <span className="font-mono">{scanUrl}</span>
          </p>

          {/* Export Buttons */}
          <div className="w-full max-w-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={exportPng} disabled={isExporting} className="gap-2">
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting…" : "Download PNG"}
              </Button>
              <Button onClick={exportPdf} variant="outline" disabled={isExporting} className="gap-2 relative">
                <FileText className="w-4 h-4" />
                PDF / Print
                {!isPremiumUser && <Crown className="w-3 h-3 text-yellow-500 absolute top-1 right-1" />}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={saveDesign} variant="outline" className="gap-2">
                <Save className="w-4 h-4" />Save Design
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                onClick={() => {
                  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
                  window.location.href = `${base}/order-sticker`;
                }}
              >
                <Package className="w-4 h-4" />
                Order Print
              </Button>
            </div>

            {/* ── Premium PDF Sticker Designs ─────────────────────────── */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Print-Ready Sticker PDFs</span>
                {!isPremiumUser && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
              </div>
              <p className="text-xs text-muted-foreground">
                8×8 cm · 300 DPI · Error Correction H · 4 designs
              </p>
              <p className="text-xs text-muted-foreground -mt-1">
                Choose Sticker Style — click any design to download
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STICKER_DESIGNS.map(design => (
                  <button
                    key={design.id}
                    onClick={() => exportStickerPdf(design.id)}
                    disabled={!!isStickerExporting}
                    className={cn(
                      "relative rounded-xl border-2 overflow-hidden text-left transition-all hover:border-primary active:scale-95",
                      "border-border hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                    style={{ borderColor: design.accentColor + "99" }}
                  >
                    {/* Real template thumbnail */}
                    <div
                      className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden"
                      style={{ background: design.bgColor }}
                    >
                      <img
                        src={design.previewUrl}
                        alt={design.name}
                        width={1024}
                        height={1024}
                        className="w-full h-full object-cover [image-rendering:auto]"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="px-2 py-1.5" style={{ background: design.bgColor }}>
                      <p
                        className="text-[11px] font-bold leading-tight"
                        style={{ color: design.textColor }}
                      >
                        {design.name}
                      </p>
                      <p
                        className="text-[9px] leading-tight opacity-70"
                        style={{ color: design.textColor }}
                      >
                        {design.description}
                      </p>
                    </div>
                    {isStickerExporting === design.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="text-white text-xs font-bold">Generating PDF…</span>
                      </div>
                    )}
                    {!isPremiumUser && (
                      <Crown className="w-4 h-4 absolute top-1.5 right-1.5 text-yellow-400 drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
              {!isPremiumUser && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Upgrade to Premium to download sticker PDFs
                </p>
              )}
            </div>
          </div>

          {/* Saved Designs */}
          {savedDesigns.length > 0 && (
            <div className="w-full max-w-sm space-y-3">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Saved Designs</span>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2">
                  {savedDesigns.map((d) => {
                    const tpl = TEMPLATES.find(t => t.id === d.templateId);
                    return (
                      <motion.button
                        key={d.savedId}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => loadSavedDesign(d)}
                        className="flex-shrink-0 rounded-xl overflow-hidden border-2 border-muted hover:border-primary transition-all"
                        style={{ width: 72, height: 90 }}
                      >
                        <div
                          className="w-full h-full flex flex-col items-center justify-center gap-1 p-1"
                          style={{ background: tpl?.previewBg ?? "#fff" }}
                        >
                          <div className="text-[6px] font-black" style={{ color: tpl?.previewAccent ?? "#333" }}>MyCarQR</div>
                          <div className="rounded-sm" style={{ width: 28, height: 28, background: `repeating-linear-gradient(45deg, ${tpl?.previewAccent ?? "#333"} 0, ${tpl?.previewAccent ?? "#333"} 2px, ${tpl?.previewBg ?? "#fff"} 2px, ${tpl?.previewBg ?? "#fff"} 5px)`, border: `1px solid ${tpl?.previewAccent ?? "#333"}60` }} />
                          <div style={{ width: 24, height: 1.5, background: tpl?.previewAccent, opacity: 0.6 }} />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* ── Left Panel: Controls ───────────────────────── */}
        <div className="lg:w-80 lg:border-r lg:overflow-y-auto flex-shrink-0 border-t lg:border-t-0">
          <Tabs defaultValue="templates" className="flex flex-col lg:h-full">
            <TabsList className="w-full rounded-none border-b h-auto p-0 bg-transparent sticky top-0 z-10 bg-background lg:static">
              {[
                { value: "templates", icon: <Layers className="w-3.5 h-3.5" />, label: "Themes" },
                { value: "content", icon: <Zap className="w-3.5 h-3.5" />, label: "Content" },
                { value: "style", icon: <Sparkles className="w-3.5 h-3.5" />, label: "Style" },
                { value: "size", icon: <Car className="w-3.5 h-3.5" />, label: "Size" },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 text-xs gap-1">
                  {t.icon}{t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Themes tab */}
            <TabsContent value="templates" className="lg:flex-1 lg:overflow-y-auto p-4 mt-0">
              <p className="text-xs text-muted-foreground mb-3">
                {isPremiumUser ? "All themes unlocked ✓" : `${TEMPLATES.filter(t => !t.isPremium).length} free · ${TEMPLATES.filter(t => t.isPremium).length} premium`}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isSelected={config.templateId === t.id}
                    isPremiumUser={isPremiumUser}
                    isEnabled={enabledThemes.includes(t.id)}
                    onClick={() => applyTemplate(t)}
                  />
                ))}
              </div>
              {!isPremiumUser && (
                <Card className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 sm:items-start">
                    <Crown className="w-4 h-4 text-yellow-600 shrink-0 sm:mt-0.5" />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2 sm:block">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 truncate sm:whitespace-normal">Upgrade for premium themes</p>
                        <p className="hidden sm:block text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">Sporty Red, Royal Gold, Neon Blue, Army Green &amp; more</p>
                      </div>
                      <Link href="/payment">
                        <Button size="sm" className="h-7 text-xs bg-yellow-600 hover:bg-yellow-700 sm:mt-2 shrink-0">
                          View Plans
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Content tab */}
            <TabsContent value="content" className="lg:flex-1 lg:overflow-y-auto p-4 mt-0 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle Number / Plate</Label>
                <Input
                  value={config.vehicleLabel}
                  onChange={e => update("vehicleLabel", e.target.value)}
                  placeholder={vehicle?.vehicleNumber ?? "MH12AB1234"}
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Custom Tagline
                  <span className="ml-1 text-muted-foreground/60 normal-case font-normal">(leave blank for default)</span>
                </Label>
                <Input
                  value={config.customTitle}
                  onChange={e => update("customTitle", e.target.value)}
                  placeholder={tagline}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2 rounded-xl border p-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin-controlled branding</p>
                <div className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 text-xs">Brand:</span>
                    <span className="font-semibold text-xs">{brandName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 text-xs">Tagline:</span>
                    <span className="text-xs">{tagline}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 text-xs">CTA:</span>
                    <span className="text-xs">{ctaText}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show "mycarqr.in" branding</Label>
                <Switch checked={config.showBranding} onCheckedChange={v => update("showBranding", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show feature icons</Label>
                <Switch checked={config.showFeatureIcons} onCheckedChange={v => update("showFeatureIcons", v)} />
              </div>

              {/* Feature icons preview */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature Icons</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FEATURE_ICONS.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1.5">
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">These are shown below the QR on the sticker.</p>
              </div>
            </TabsContent>

            {/* Style tab */}
            <TabsContent value="style" className="lg:flex-1 lg:overflow-y-auto p-4 mt-0 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accent / QR Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.accentColor.startsWith("#") ? config.accentColor : "#1a3a6e"}
                    onChange={e => { update("accentColor", e.target.value); update("qrDark", e.target.value); update("borderColor", e.target.value); }}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{config.accentColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Text Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.textColor}
                    onChange={e => update("textColor", e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{config.textColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">QR Background</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.qrLight.startsWith("#") ? config.qrLight : "#ffffff"}
                    onChange={e => update("qrLight", e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{config.qrLight}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Corner Radius: {config.borderRadius}px
                </Label>
                <Slider min={0} max={32} step={2} value={[config.borderRadius]}
                  onValueChange={([v]) => update("borderRadius", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Drop Shadow</Label>
                <Switch checked={config.showShadow} onCheckedChange={v => update("showShadow", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Border</Label>
                <Switch checked={config.showBorder} onCheckedChange={v => update("showBorder", v)} />
              </div>
              {config.showBorder && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Border Width: {config.borderWidth}px
                  </Label>
                  <Slider min={1} max={6} step={1} value={[config.borderWidth]}
                    onValueChange={([v]) => update("borderWidth", v)} />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Font Weight</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["normal", "bold", "black"] as FontWeight[]).map(fw => (
                    <button
                      key={fw}
                      onClick={() => update("fontWeight", fw)}
                      className={cn(
                        "py-2 rounded-lg border-2 text-xs transition-all capitalize",
                        config.fontWeight === fw ? "border-primary bg-primary/5 font-bold" : "border-muted"
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Size tab */}
            <TabsContent value="size" className="lg:flex-1 lg:overflow-y-auto p-4 mt-0 space-y-4">
              <p className="text-xs text-muted-foreground">Choose the sticker size for printing. All sizes are print-ready.</p>
              <div className="space-y-2">
                {(Object.entries(STICKER_SIZES) as [StickerSizeId, typeof STICKER_SIZES[StickerSizeId]][]).map(([key, s]) => (
                  <button
                    key={key}
                    onClick={() => update("stickerSize", key)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all",
                      config.stickerSize === key ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-sm">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                    {config.stickerSize === key && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
