import { Resvg } from "@resvg/resvg-js";
import type { SvgRasterizeOptions } from "@vetor/contracts";
import sharp from "sharp";
import { VetorError } from "../errors";
import type { EngineResult } from "../types";
import { sanitizeSvg } from "./sanitize";

const unsupportedHints = [
  { pattern: /<filter\b/i, message: "Filtros SVG avançados podem ser aproximados." },
  { pattern: /<mask\b/i, message: "Máscaras complexas podem perder fidelidade." },
  { pattern: /<foreignObject\b/i, message: "foreignObject não é suportado." },
];

export async function rasterizeSvg(
  bytes: Buffer,
  options: SvgRasterizeOptions,
): Promise<EngineResult> {
  const svg = sanitizeSvg(bytes.toString("utf8"));
  const warnings = unsupportedHints
    .filter((item) => item.pattern.test(svg))
    .map((item) => item.message);

  const resvg = new Resvg(svg, {
    fitTo: resolveFit(options),
    background: options.transparent ? undefined : (options.background ?? "#ffffff"),
  });

  let png: Buffer = Buffer.from(resvg.render().asPng());
  const rendered = await sharp(png).metadata();

  if (options.lockAspect && options.width && options.height) {
    png = await sharp(png)
      .resize({
        width: options.width,
        height: options.height,
        fit: "contain",
        background: options.transparent
          ? { r: 0, g: 0, b: 0, alpha: 0 }
          : hexToColor(options.background ?? "#ffffff"),
      })
      .png()
      .toBuffer();
  }

  const meta = await sharp(png).metadata();
  if (!meta.width || !meta.height) {
    throw new VetorError("svg_rasterize_failed", "Não foi possível rasterizar o SVG.");
  }

  return {
    buffer: png,
    mimeType: "image/png",
    fileName: "rasterizado.png",
    width: meta.width,
    height: meta.height,
    metadata: {
      warnings,
      scale: options.scale ?? 1,
      transparent: options.transparent,
    },
  };
}

function resolveFit(options: SvgRasterizeOptions) {
  if (options.scale && options.scale !== 1) {
    return { mode: "zoom" as const, value: options.scale };
  }
  if (options.width) {
    return { mode: "width" as const, value: options.width };
  }
  if (options.height) {
    return { mode: "height" as const, value: options.height };
  }
  return { mode: "original" as const };
}

function hexToColor(value: string) {
  const hex = value.replace("#", "");
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    alpha: 1,
  };
}

export async function optimizeSvg(bytes: Buffer): Promise<EngineResult> {
  const { optimize } = await import("svgo");
  const svg = sanitizeSvg(bytes.toString("utf8"));
  const result = optimize(svg, {
    multipass: true,
    plugins: ["preset-default"],
  });

  return {
    buffer: Buffer.from(result.data, "utf8"),
    mimeType: "image/svg+xml",
    fileName: "otimizado.svg",
    width: null,
    height: null,
    metadata: {
      originalBytes: bytes.length,
      optimizedBytes: Buffer.byteLength(result.data),
    },
  };
}
