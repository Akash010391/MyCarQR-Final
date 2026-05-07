import QRCode from "qrcode";
import jsPDF from "jspdf";

export type StickerDesign =
  | "midnight-carbon"
  | "light-premium"
  | "racing-red"
  | "electric-blue";

export interface StickerDesignMeta {
  id: StickerDesign;
  name: string;
  description: string;
  /** Legacy 1024px JPEG (back-compat). */
  templateUrl: string;
  /** 512px square JPEG — fastest, used for app icon / small thumbnails. */
  thumbnailUrl: string;
  /** 1024px square PNG — used in preview cards / selectors (HiDPI sharp). */
  previewUrl: string;
  /** 2048px square PNG — used for PDF/sticker print (highest fidelity). */
  printTemplateUrl: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
  qrDark: string;
  qrLight: string;
}

const BASE = import.meta.env.BASE_URL;

function buildAssetSet(slug: string) {
  return {
    templateUrl: `${BASE}stickers/${slug}.jpg`,
    thumbnailUrl: `${BASE}stickers/${slug}-512.png`,
    previewUrl: `${BASE}stickers/${slug}-1024.png`,
    printTemplateUrl: `${BASE}stickers/${slug}-2048.png`,
  };
}

export const STICKER_DESIGNS: StickerDesignMeta[] = [
  {
    id: "midnight-carbon",
    name: "Midnight Carbon",
    description: "Black + Gold premium",
    ...buildAssetSet("midnight"),
    bgColor: "#000000",
    accentColor: "#d4a017",
    textColor: "#d4a017",
    qrDark: "#000000",
    qrLight: "#ffffff",
  },
  {
    id: "light-premium",
    name: "Light Premium",
    description: "White + Gold luxury",
    ...buildAssetSet("light"),
    bgColor: "#ffffff",
    accentColor: "#b8860b",
    textColor: "#1a1a1a",
    qrDark: "#000000",
    qrLight: "#ffffff",
  },
  {
    id: "racing-red",
    name: "Racing Red",
    description: "Bold red sport edition",
    ...buildAssetSet("red"),
    bgColor: "#000000",
    accentColor: "#e53935",
    textColor: "#ff4040",
    qrDark: "#000000",
    qrLight: "#ffffff",
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    description: "Vibrant electric blue",
    ...buildAssetSet("blue"),
    bgColor: "#06121f",
    accentColor: "#1ea3ff",
    textColor: "#33b6ff",
    qrDark: "#000000",
    qrLight: "#ffffff",
  },
];

const PX = 945; // 8 cm at ~300 DPI (8 / 2.54 * 300 ≈ 945)

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawCutMarks(ctx: CanvasRenderingContext2D, S: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const cmLen = 26;
  const cmOff = 4;
  // top-left
  ctx.beginPath(); ctx.moveTo(cmOff, 0); ctx.lineTo(cmOff, cmLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cmOff); ctx.lineTo(cmLen, cmOff); ctx.stroke();
  // top-right
  ctx.beginPath(); ctx.moveTo(S - cmOff, 0); ctx.lineTo(S - cmOff, cmLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S, cmOff); ctx.lineTo(S - cmLen, cmOff); ctx.stroke();
  // bottom-left
  ctx.beginPath(); ctx.moveTo(cmOff, S); ctx.lineTo(cmOff, S - cmLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, S - cmOff); ctx.lineTo(cmLen, S - cmOff); ctx.stroke();
  // bottom-right
  ctx.beginPath(); ctx.moveTo(S - cmOff, S); ctx.lineTo(S - cmOff, S - cmLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S, S - cmOff); ctx.lineTo(S - cmLen, S - cmOff); ctx.stroke();
}

/** Fallback: draw a simple plain sticker if template image fails to load. */
function drawFallbackBackground(ctx: CanvasRenderingContext2D, design: StickerDesignMeta) {
  const S = PX;
  // Gradient background
  ctx.fillStyle = design.bgColor;
  ctx.fillRect(0, 0, S, S);
  // Accent border
  ctx.strokeStyle = design.accentColor;
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, S - 40, S - 40);
  // Header brand
  ctx.fillStyle = design.accentColor;
  ctx.font = "bold 64px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MyCarQR", S / 2, 100);
}

async function drawDesign(
  ctx: CanvasRenderingContext2D,
  design: StickerDesignMeta,
  vehicleNumber: string,
  qrDataUrl: string,
  templateUrl: string,
): Promise<void> {
  const S = PX;
  ctx.clearRect(0, 0, S, S);

  // Use highest-quality image smoothing for crisp downsampling of HD template → 945px
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Try to load template image (HD); fall back to legacy 1024 jpg if HD asset missing
  let template = await loadImage(templateUrl);
  if (!template && templateUrl !== design.templateUrl) {
    template = await loadImage(design.templateUrl);
  }

  // Bottom info area starts at 70% — leaves space for vehicle number + Hindi text
  const TEMPLATE_AREA_H = Math.floor(S * 0.7); // ≈ 661
  const INFO_AREA_Y = TEMPLATE_AREA_H;
  const INFO_AREA_H = S - TEMPLATE_AREA_H;     // ≈ 284

  // 2. Background fill (also acts as fallback if template fails)
  ctx.fillStyle = design.bgColor;
  ctx.fillRect(0, 0, S, S);

  if (template) {
    // Scale template to fit width while preserving aspect ratio,
    // center it vertically inside the template area
    const scaledW = S;
    const scaledH = Math.round(S * (template.height / template.width));
    const drawY = Math.max(0, Math.round((TEMPLATE_AREA_H - scaledH) / 2));
    ctx.drawImage(template, 0, drawY, scaledW, scaledH);
  } else {
    drawFallbackBackground(ctx, design);
  }

  // 3. Draw bottom info area background (covers any template overflow)
  ctx.fillStyle = design.bgColor;
  ctx.fillRect(0, INFO_AREA_Y, S, INFO_AREA_H);

  // 4. Divider line between template and info area
  ctx.strokeStyle = design.accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, INFO_AREA_Y + 4);
  ctx.lineTo(S - 60, INFO_AREA_Y + 4);
  ctx.stroke();

  // 5. Overlay real QR over the decorative QR in the template
  // The decorative QR sits ~28% from top of the SCALED template
  const qrSize = 320;
  const qrX = Math.round((S - qrSize) / 2);
  // Place QR so its center sits where the decorative QR appears in the template
  // Decorative QR center is roughly at 42% of original template height (which is ~630 scaled)
  // → that's y ≈ 265. Subtract qrSize/2 = 160 → qrY ≈ 105
  const qrY = 100;

  // White pad behind QR — gives quiet zone + ensures contrast against any bg
  const pad = 26;
  ctx.fillStyle = "#ffffff";
  // rounded-corner white pad
  const padX = qrX - pad;
  const padY = qrY - pad;
  const padW = qrSize + pad * 2;
  const padH = qrSize + pad * 2;
  const padR = 18;
  ctx.beginPath();
  ctx.moveTo(padX + padR, padY);
  ctx.lineTo(padX + padW - padR, padY);
  ctx.quadraticCurveTo(padX + padW, padY, padX + padW, padY + padR);
  ctx.lineTo(padX + padW, padY + padH - padR);
  ctx.quadraticCurveTo(padX + padW, padY + padH, padX + padW - padR, padY + padH);
  ctx.lineTo(padX + padR, padY + padH);
  ctx.quadraticCurveTo(padX, padY + padH, padX, padY + padH - padR);
  ctx.lineTo(padX, padY + padR);
  ctx.quadraticCurveTo(padX, padY, padX + padR, padY);
  ctx.closePath();
  ctx.fill();
  // thin accent border around the white pad
  ctx.strokeStyle = design.accentColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 6. Draw the actual scannable QR
  const qrImg = await loadImage(qrDataUrl);
  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // 7. Vehicle number — big, centered at top of info area
  ctx.fillStyle = design.accentColor;
  ctx.font = "bold 56px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(vehicleNumber.toUpperCase(), S / 2, INFO_AREA_Y + 70);

  // 8. "Scan to Contact Owner"
  ctx.fillStyle = design.textColor;
  ctx.font = "600 28px Arial, Helvetica, sans-serif";
  ctx.fillText("Scan to Contact Owner", S / 2, INFO_AREA_Y + 130);

  // 9. Hindi
  ctx.font = "500 26px Arial, Helvetica, sans-serif";
  ctx.fillText("मालिक से संपर्क करें", S / 2, INFO_AREA_Y + 175);

  // 10. Footer
  const isLight = design.bgColor === "#ffffff";
  ctx.fillStyle = isLight ? "#666666" : "#aaaaaa";
  ctx.font = "16px Arial, Helvetica, sans-serif";
  ctx.fillText("Print on glossy vinyl and laminate for best results", S / 2, INFO_AREA_Y + 235);

  // 11. Cut marks
  drawCutMarks(ctx, S, design.accentColor);
}

export async function generateStickerPDF(
  design: StickerDesignMeta,
  scanUrl: string,
  vehicleNumber: string
): Promise<void> {
  // QR is regenerated FRESH at high resolution (1200px) — error correction H —
  // so when downsampled into the 320px QR area on the 945px (300 DPI) canvas
  // the modules stay perfectly square and crisp.
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 1200,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: design.qrDark, light: design.qrLight },
  });

  // Draw to canvas at exact 300 DPI for an 8 cm sticker (PX = 945)
  const canvas = document.createElement("canvas");
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext("2d")!;
  // Use the 2048px HD print template — gives crisp downsampled output
  await drawDesign(ctx, design, vehicleNumber, qrDataUrl, design.printTemplateUrl);

  // Export canvas → high-quality JPEG (0.97) for PDF
  const imgDataUrl = canvas.toDataURL("image/jpeg", 0.97);

  // jsPDF 86×86 mm (slightly larger so cut marks have bleed); compress: false
  // keeps the embedded JPEG quality intact.
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [86, 86],
    compress: false,
  });
  pdf.addImage(imgDataUrl, "JPEG", 0, 0, 86, 86, undefined, "FAST");

  const safeVehicle = vehicleNumber.replace(/[^a-zA-Z0-9]/g, "-");
  pdf.save(`MyCarQR-${safeVehicle}-${design.id}.pdf`);
}

/**
 * Returns a JPEG data-URL preview of the sticker — for showing on style picker cards
 * without actually downloading the PDF. Uses the 1024px preview template (smaller
 * and faster to load than the 2048 print version).
 */
export async function generateStickerPreviewDataUrl(
  design: StickerDesignMeta,
  scanUrl: string,
  vehicleNumber: string,
): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 600,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: design.qrDark, light: design.qrLight },
  });
  const canvas = document.createElement("canvas");
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext("2d")!;
  await drawDesign(ctx, design, vehicleNumber, qrDataUrl, design.previewUrl);
  return canvas.toDataURL("image/jpeg", 0.92);
}
