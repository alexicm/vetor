import type { RasterConvertOptions, RasterResizeOptions } from "@vetor/contracts";
import sharp from "sharp";
import { VetorError } from "../errors";
import { assertMegapixels } from "../limits";
import type { EngineResult } from "../types";

const formatToSharp = {
  png: "png",
  jpg: "jpeg",
  webp: "webp",
  avif: "avif",
  tiff: "tiff",
  bmp: "png",
} as const;

const mimeByFormat = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  tiff: "image/tiff",
  bmp: "image/bmp",
} as const;

export async function convertRaster(
  bytes: Buffer,
  options: RasterConvertOptions,
): Promise<EngineResult> {
  if (options.format === "bmp") {
    throw new VetorError(
      "format_unsupported",
      "A exportação em BMP não está disponível. Use PNG, JPG, WebP, AVIF ou TIFF.",
    );
  }

  return renderRaster(bytes, options);
}

export async function resizeRaster(
  bytes: Buffer,
  options: RasterResizeOptions,
): Promise<EngineResult> {
  return renderRaster(bytes, {
    ...options,
    format: options.format ?? "png",
  });
}

async function renderRaster(
  bytes: Buffer,
  options: RasterConvertOptions,
): Promise<EngineResult> {
  let pipeline = sharp(bytes, { failOn: "none", sequentialRead: true }).rotate();
  const input = await pipeline.metadata();
  assertMegapixels(input.width, input.height);

  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit === "resize" ? "fill" : options.fit,
      withoutEnlargement: false,
      background: parseColor(options.background),
    });
  }

  if (options.stripMetadata && !options.preserveIcc) {
    pipeline = pipeline.withMetadata({});
  } else if (options.preserveIcc && input.icc) {
    pipeline = pipeline.keepIccProfile();
  }

  if (options.dpi) {
    pipeline = pipeline.withMetadata({ density: options.dpi });
  }

  const quality = options.quality ?? 90;
  const outputFormat = formatToSharp[options.format];
  const supportsAlpha = options.format === "png" || options.format === "webp" || options.format === "avif" || options.format === "tiff";

  if (!supportsAlpha) {
    pipeline = pipeline.flatten({
      background: parseColor(options.background ?? "#ffffff"),
    });
  }

  if (outputFormat === "jpeg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (outputFormat === "png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (outputFormat === "webp") {
    pipeline = pipeline.webp({ quality });
  } else if (outputFormat === "avif") {
    pipeline = pipeline.avif({ quality });
  } else {
    pipeline = pipeline.tiff({ quality, compression: "lzw" });
  }

  const buffer = Buffer.from(await pipeline.toBuffer());
  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    mimeType: mimeByFormat[options.format],
    fileName: `convertido.${options.format}`,
    width: meta.width ?? null,
    height: meta.height ?? null,
    metadata: {
      dpi: options.dpi ?? meta.density ?? null,
      quality,
      backgroundApplied: !supportsAlpha,
    },
  };
}

export function parseColor(value?: string) {
  if (!value) return { r: 255, g: 255, b: 255, alpha: 1 };
  const hex = value.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, alpha };
}
