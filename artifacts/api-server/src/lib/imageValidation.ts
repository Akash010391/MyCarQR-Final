import { imageSize } from "image-size";

const ALLOWED_PREFIXES: Array<{ prefix: string; magic: number[][] }> = [
  {
    prefix: "data:image/jpeg;base64,",
    magic: [[0xff, 0xd8, 0xff]],
  },
  {
    prefix: "data:image/png;base64,",
    magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  {
    prefix: "data:image/webp;base64,",
    magic: [
      [0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50],
    ],
  },
  {
    prefix: "data:image/gif;base64,",
    magic: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
  },
];

const MAX_BASE64_BYTES = Math.floor(8 * 1024 * 1024 * 1.4);

const RAW_MAGIC_PATTERNS: number[][] = ALLOWED_PREFIXES.flatMap((p) => p.magic);

function bytesMatch(actual: Uint8Array, pattern: number[]): boolean {
  if (actual.length < pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === -1) continue;
    if (actual[i] !== pattern[i]) return false;
  }
  return true;
}

export function validateScreenshot(value: unknown): string | null {
  if (typeof value !== "string") return "Screenshot must be a string";

  const allowed = ALLOWED_PREFIXES.find((p) => value.startsWith(p.prefix));
  if (!allowed) {
    return "Screenshot must be a JPEG, PNG, WEBP, or GIF image";
  }

  if (value.length > MAX_BASE64_BYTES) {
    return "Screenshot exceeds maximum allowed size (8 MB)";
  }

  const base64Part = value.slice(allowed.prefix.length);
  if (base64Part.length === 0) {
    return "Screenshot data is empty";
  }

  let header: Uint8Array;
  try {
    const headerB64 = base64Part.slice(0, 24);
    header = Uint8Array.from(Buffer.from(headerB64, "base64"));
  } catch {
    return "Screenshot data is not valid base64";
  }

  const matchesMagic = allowed.magic.some((m) => bytesMatch(header, m));
  if (!matchesMagic) {
    return "Screenshot file content does not match its declared image type";
  }

  return null;
}

/**
 * Verify a raw byte buffer (the first chunk of a file) starts with a magic
 * sequence belonging to one of our accepted image formats. Used to validate
 * photos that were uploaded directly to object storage.
 */
export function validateImageMagic(bytes: Uint8Array): string | null {
  const matchesMagic = RAW_MAGIC_PATTERNS.some((m) => bytesMatch(bytes, m));
  if (!matchesMagic) {
    return "Photo content is not a valid JPEG, PNG, WEBP or GIF image";
  }
  return null;
}

// Reasonable bounds for user-uploaded photos. These are deliberately generous
// for the long edge (the client compresses to ~1280px) but cap the total pixel
// count so a hostile client can't send a 100k × 100k "image" that would blow
// up image decoders downstream (compression bombs).
const MIN_IMAGE_EDGE = 16;
const MAX_IMAGE_EDGE = 8192;
const MAX_IMAGE_MEGAPIXELS = 24;

/**
 * Decode the dimensions of an image header buffer using `image-size` and check
 * they fall within sensible bounds. Pass a buffer containing at least the first
 * ~256KB of the file — `image-size` only reads headers/markers, never the full
 * pixel data.
 */
export function validateImageDimensions(bytes: Uint8Array): string | null {
  let dims: { width?: number; height?: number };
  try {
    dims = imageSize(bytes);
  } catch {
    return "Photo dimensions could not be read";
  }
  const width = dims.width ?? 0;
  const height = dims.height ?? 0;
  if (!width || !height) {
    return "Photo dimensions could not be read";
  }
  if (width < MIN_IMAGE_EDGE || height < MIN_IMAGE_EDGE) {
    return `Photo is too small (must be at least ${MIN_IMAGE_EDGE}×${MIN_IMAGE_EDGE} pixels)`;
  }
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) {
    return `Photo is too large (max ${MAX_IMAGE_EDGE} pixels per side)`;
  }
  const megapixels = (width * height) / 1_000_000;
  if (megapixels > MAX_IMAGE_MEGAPIXELS) {
    return `Photo is too large (max ${MAX_IMAGE_MEGAPIXELS} megapixels)`;
  }
  return null;
}
