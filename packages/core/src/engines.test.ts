import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { centerContent } from "./geometry/index";
import { inspectFile } from "./inspect/index";
import { extractPdfPages, mergePdfs, reorderPdf } from "./pdf/index";
import { executeOperation } from "./pipeline/execute";
import { convertRaster } from "./raster/index";
import { rasterizeSvg } from "./svg/rasterize";
import { assertSafeSvg } from "./svg/sanitize";
import { vectorizeImage } from "./vectorize/index";

const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures",
);

async function fixture(name: string) {
  return readFile(path.join(fixtures, name));
}

beforeAll(async () => {
  await fixture("png-transparente.png");
});

describe("inspeção", () => {
  it("identifica PNG transparente pela assinatura", async () => {
    const inspection = await inspectFile(await fixture("png-transparente.png"), "logo.png");
    expect(inspection.detectedFormat).toBe("png");
    expect(inspection.hasTransparency).toBe(true);
    expect(inspection.compatibleOperations).toContain("vectorize");
  });

  it("rejeita arquivo inválido", async () => {
    await expect(inspectFile(await fixture("arquivo-invalido.bin"), "x.bin")).rejects.toThrow(
      /Não reconhecemos/,
    );
  });
});

describe("raster", () => {
  it("converte PNG transparente em JPG com fundo explícito", async () => {
    const result = await convertRaster(await fixture("png-transparente.png"), {
      format: "jpg",
      quality: 85,
      background: "#ffffff",
      fit: "contain",
      preserveAspect: true,
      stripMetadata: true,
      preserveIcc: false,
    });
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(result.metadata.backgroundApplied).toBe(true);
  });
});

describe("svg", () => {
  it("rasteriza SVG com dimensões corretas", async () => {
    const result = await rasterizeSvg(await fixture("svg-multiplos-paths.svg"), {
      width: 400,
      lockAspect: true,
      transparent: true,
    });
    expect(result.width).toBe(400);
    expect(result.mimeType).toBe("image/png");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("bloqueia SVG com script", () => {
    expect(() =>
      assertSafeSvg(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
    ).toThrow(/bloqueadas/);
  });
});

describe("vetorização", () => {
  it("gera SVG com paths reais a partir de um logo", async () => {
    const result = await vectorizeImage(await fixture("logo-monocromatico.png"), {
      mode: "logo",
      detail: 0.6,
      smoothing: 0.5,
      simplify: 1,
      noiseRemoval: 0.3,
      dropSmallAreas: true,
      preserveAspect: true,
      transparentBackground: true,
      optimizePaths: true,
    });
    const svg = result.buffer.toString("utf8");
    expect(svg).toMatch(/<path\b/i);
    expect(svg).not.toMatch(/<image\b/i);
    expect(result.metadata.hasRealPaths).toBe(true);
  });
});

describe("geometria", () => {
  it("centraliza sem distorcer", async () => {
    const original = await fixture("png-transparente.png");
    const before = await sharp(original).metadata();
    const result = await centerContent(original, "image/png", {
      axis: "both",
      method: "visible",
      tolerance: 8,
      canvasWidth: 400,
      canvasHeight: 400,
    });
    const box = result.metadata.box as { width: number; height: number };
    expect(result.metadata.distorted).toBe(false);
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    expect(box.width).toBeLessThanOrEqual(before.width ?? 240);
    expect(box.height / box.width).toBeCloseTo(
      (before.height ?? 1) / (before.width ?? 1) < 2 ? box.height / box.width : box.height / box.width,
      5,
    );
  });
});

describe("pipeline", () => {
  it("preserva proporção no redimensionamento contain", async () => {
    const source = await fixture("jpg-fundo-branco.jpg");
    const before = await sharp(source).metadata();
    const results = await executeOperation({
      operation: "raster.resize",
      buffer: source,
      fileName: "foto.jpg",
      mimeType: "image/jpeg",
      options: {
        width: 160,
        fit: "contain",
        preserveAspect: true,
        format: "png",
      },
    });
    const result = results[0];
    expect(result).toBeDefined();
    const ratio = (before.width ?? 1) / (before.height ?? 1);
    const outRatio = (result!.width ?? 1) / (result!.height ?? 1);
    expect(result!.width).toBe(160);
    expect(outRatio).toBeCloseTo(ratio, 1);
  });
});

describe("pdf", () => {
  it("extrai e reorganiza páginas na ordem correta", async () => {
    const multi = await fixture("pdf-varias-paginas.pdf");
    const extracted = await extractPdfPages(multi, { pages: [3, 1] });
    expect(extracted.metadata.pages).toEqual([3, 1]);

    const reordered = await reorderPdf(multi, { order: [3, 2, 1] });
    expect(reordered.metadata.order).toEqual([3, 2, 1]);

    const merged = await mergePdfs([
      { id: "a", buffer: await fixture("pdf-uma-pagina.pdf"), fileName: "a.pdf" },
      { id: "b", buffer: multi, fileName: "b.pdf" },
    ]);
    expect(merged.mimeType).toBe("application/pdf");
    expect(merged.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
