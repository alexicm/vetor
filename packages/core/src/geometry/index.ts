import type {
  GeometryCanvasOptions,
  GeometryCenterOptions,
  GeometryTrimOptions,
} from "@vetor/contracts";
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { parseColor } from "../raster/index";
import { sanitizeSvg } from "../svg/sanitize";
import type { EngineResult } from "../types";

interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export async function centerContent(
  bytes: Buffer,
  mimeType: string,
  options: GeometryCenterOptions,
): Promise<EngineResult> {
  const raster = await toRaster(bytes, mimeType);
  const meta = await sharp(raster).metadata();
  const width = options.canvasWidth ?? meta.width ?? 0;
  const height = options.canvasHeight ?? meta.height ?? 0;
  const box =
    options.method === "visible"
      ? await visibleBox(raster, options.tolerance)
      : { left: 0, top: 0, width: meta.width ?? 0, height: meta.height ?? 0 };

  const extracted = await sharp(raster)
    .extract({
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    })
    .toBuffer();

  const offsetX =
    options.axis === "vertical" ? box.left : Math.round((width - box.width) / 2);
  const offsetY =
    options.axis === "horizontal" ? box.top : Math.round((height - box.height) / 2);

  const composed = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: options.background
        ? parseColor(options.background)
        : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: extracted, left: Math.max(0, offsetX), top: Math.max(0, offsetY) }])
    .png()
    .toBuffer();

  return {
    buffer: composed,
    mimeType: "image/png",
    fileName: "centralizado.png",
    width,
    height,
    metadata: {
      method: options.method,
      box,
      distorted: false,
    },
  };
}

export async function trimTransparent(
  bytes: Buffer,
  mimeType: string,
  options: GeometryTrimOptions,
): Promise<EngineResult> {
  const raster = await toRaster(bytes, mimeType);
  const box = await visibleBox(raster, options.tolerance);
  const padded = {
    left: Math.max(0, box.left - options.padding),
    top: Math.max(0, box.top - options.padding),
    width: box.width + options.padding * 2,
    height: box.height + options.padding * 2,
  };
  const meta = await sharp(raster).metadata();
  padded.width = Math.min(padded.width, (meta.width ?? padded.width) - padded.left);
  padded.height = Math.min(padded.height, (meta.height ?? padded.height) - padded.top);

  const buffer = await sharp(raster).extract(padded).png().toBuffer();
  const out = await sharp(buffer).metadata();

  return {
    buffer,
    mimeType: "image/png",
    fileName: "aparado.png",
    width: out.width ?? padded.width,
    height: out.height ?? padded.height,
    metadata: { box: padded },
  };
}

export async function fitToCanvas(
  bytes: Buffer,
  mimeType: string,
  options: GeometryCanvasOptions,
): Promise<EngineResult> {
  return centerContent(bytes, mimeType, {
    axis: "both",
    method: options.method,
    tolerance: options.tolerance,
    canvasWidth: options.width,
    canvasHeight: options.height,
    background: options.background,
  });
}

export async function visibleBox(bytes: Buffer, tolerance: number): Promise<BoundingBox> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const alpha = data[index + 3] ?? 0;
      if (alpha > tolerance) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return { left: 0, top: 0, width: info.width, height: info.height };
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function toRaster(bytes: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === "image/svg+xml") {
    const svg = sanitizeSvg(bytes.toString("utf8"));
    return Buffer.from(new Resvg(svg).render().asPng());
  }
  return sharp(bytes).rotate().ensureAlpha().png().toBuffer();
}
