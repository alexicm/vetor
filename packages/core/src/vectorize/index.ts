import type { VectorizeOptions } from "@vetor/contracts";
import sharp from "sharp";
import { optimize as svgoOptimize } from "svgo";
import { VetorError } from "../errors";
import { assertMegapixels } from "../limits";
import { embedsRasterImage, hasRealVectorPaths, sanitizeSvg } from "../svg/sanitize";
import type { EngineResult } from "../types";

interface VtracerModule {
  convertBuffer: (buffer: Buffer, options: Record<string, unknown>) => string;
  convertPixels?: (
    rgba: Uint8Array,
    width: number,
    height: number,
    options: Record<string, unknown>,
  ) => string;
}

let loaded: VtracerModule | null = null;

async function loadVtracer(): Promise<VtracerModule> {
  if (loaded) return loaded;
  const mod = (await import("@visioncortex/vtracer")) as VtracerModule;
  loaded = mod;
  return mod;
}

export function translateVectorizeOptions(options: VectorizeOptions) {
  const speckle = options.dropSmallAreas
    ? Math.round(4 + options.noiseRemoval * 28)
    : 0;
  const simplify = options.simplify;
  const corner = Math.round(30 + (1 - options.smoothing) * 60);
  const unavailable: string[] = [];

  if (options.preserveAspect === false) {
    unavailable.push(
      "A preservação de proporção é sempre mantida pelo motor de vetorização.",
    );
  }

  if (options.mode === "logo") {
    return {
      engine: {
        preset: "poster",
        clustering: "color-cluster",
        hierarchical: "stacked",
        mode: "spline",
        maxColors: options.colorCount ?? 8,
        filterSpeckle: speckle,
        colorPrecision: Math.round(4 + options.detail * 4),
        layerDifference: Math.round(8 + (1 - options.detail) * 24),
        cornerThreshold: corner,
        simplify,
        pathPrecision: 2,
        optimize: options.optimizePaths ? 2 : 0,
      },
      unavailable,
    };
  }

  if (options.mode === "mono") {
    return {
      engine: {
        preset: "bw",
        clustering: "bw",
        hierarchical: "stacked",
        mode: "spline",
        filterSpeckle: speckle,
        cornerThreshold: corner,
        simplify,
        pathPrecision: 2,
        optimize: options.optimizePaths ? 2 : 0,
        adaptive: true,
      },
      unavailable,
    };
  }

  return {
    engine: {
      preset: "photo",
      clustering: "color-cluster",
      hierarchical: "stacked",
      mode: "spline",
      maxColors: options.colorCount ?? 16,
      filterSpeckle: Math.max(2, speckle - 6),
      colorPrecision: Math.round(6 + options.detail * 2),
      layerDifference: Math.round(4 + (1 - options.detail) * 16),
      cornerThreshold: corner,
      simplify: Math.max(0.4, simplify - 0.3),
      pathPrecision: 2,
      optimize: options.optimizePaths ? 1 : 0,
    },
    unavailable,
  };
}

export async function vectorizeImage(
  bytes: Buffer,
  options: VectorizeOptions,
): Promise<EngineResult> {
  const meta = await sharp(bytes).metadata();
  assertMegapixels(meta.width, meta.height);

  const normalized = await sharp(bytes)
    .rotate()
    .ensureAlpha()
    .png()
    .toBuffer();

  const { engine, unavailable } = translateVectorizeOptions(options);
  const vtracer = await loadVtracer();
  let svg = vtracer.convertBuffer(normalized, engine);

  if (options.optimizePaths) {
    svg = svgoOptimize(svg, {
      multipass: true,
      plugins: ["preset-default"],
    }).data;
  }

  svg = sanitizeSvg(svg);

  if (!hasRealVectorPaths(svg) || embedsRasterImage(svg)) {
    throw new VetorError(
      "vectorize_failed",
      "A vetorização não gerou caminhos editáveis. Tente outro modo ou uma imagem com menos ruído.",
    );
  }

  const fidelityWarning =
    options.mode === "illustration"
      ? "Fotos e degradês são aproximados por regiões de cor. A reconstrução não é perfeita."
      : options.mode === "mono"
        ? "Detalhes finos e letras degradadas podem ser simplificados."
        : "Logotipos com muitas cores ou sombras podem perder fidelidade.";

  return {
    buffer: Buffer.from(svg, "utf8"),
    mimeType: "image/svg+xml",
    fileName: "vetorizado.svg",
    width: meta.width ?? null,
    height: meta.height ?? null,
    metadata: {
      pathCount: (svg.match(/<path\b/gi) ?? []).length,
      hasRealPaths: true,
      fidelityWarning,
      unavailableParameters: unavailable,
      engineOptions: engine,
      transparentBackground: options.transparentBackground,
    },
  };
}
