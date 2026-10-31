import type { FileInspection, GraphicFormat, Operation } from "@vetor/contracts";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { VetorError } from "../errors";
import { assertFileSize, assertMegapixels, limits } from "../limits";
import { detectSignature, extensionOf } from "./signatures";

const rasterOps: Operation[] = [
  "raster.convert",
  "raster.resize",
  "vectorize",
  "geometry.center",
  "geometry.trim",
  "geometry.canvas",
  "pdf.imagesToPdf",
];

const svgOps: Operation[] = [
  "svg.rasterize",
  "svg.optimize",
  "geometry.center",
  "geometry.trim",
  "geometry.canvas",
];

const pdfOps: Operation[] = [
  "pdf.extract",
  "pdf.merge",
  "pdf.reorder",
  "pdf.rotate",
  "pdf.pagesToImages",
];

export async function inspectFile(
  bytes: Buffer,
  fileName: string,
  declaredMime?: string | null,
): Promise<FileInspection> {
  assertFileSize(bytes.length);

  const signature = detectSignature(bytes);
  if (!signature) {
    throw new VetorError(
      "unsupported_format",
      "Não reconhecemos este arquivo. Envie PNG, JPG, WebP, AVIF, TIFF, BMP, SVG ou PDF.",
    );
  }

  const extension = extensionOf(fileName);
  const warnings: string[] = [];
  if (extension && extension !== signature.format && extension !== "jpeg") {
    warnings.push(
      `A extensão .${extension} não corresponde ao formato real (${signature.format}).`,
    );
  }

  const base: FileInspection = {
    detectedFormat: signature.format,
    extension,
    declaredMime: declaredMime ?? null,
    mimeType: signature.mime,
    fileSize: bytes.length,
    width: null,
    height: null,
    aspectRatio: null,
    hasTransparency: null,
    colorSpace: null,
    hasIccProfile: false,
    orientation: null,
    pageCount: null,
    hasVectorContent: null,
    hasEmbeddedImages: null,
    compatibleOperations: [],
    warnings,
  };

  if (signature.format === "svg") {
    return inspectSvg(bytes, base);
  }

  if (signature.format === "pdf") {
    return inspectPdf(bytes, base);
  }

  return inspectRaster(bytes, signature.format, base);
}

async function inspectRaster(
  bytes: Buffer,
  format: GraphicFormat,
  base: FileInspection,
): Promise<FileInspection> {
  const image = sharp(bytes, { failOn: "none", sequentialRead: true });
  const metadata = await image.metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  assertMegapixels(width, height);

  const stats = await image.stats();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const isOpaque = stats.isOpaque;

  return {
    ...base,
    width,
    height,
    aspectRatio: width && height ? width / height : null,
    hasTransparency: hasAlpha && !isOpaque,
    colorSpace: metadata.space ?? null,
    hasIccProfile: Boolean(metadata.icc),
    orientation: metadata.orientation ?? 1,
    compatibleOperations:
      format === "bmp"
        ? rasterOps.filter((op) => op !== "vectorize" || true)
        : rasterOps,
  };
}

function inspectSvg(bytes: Buffer, base: FileInspection): FileInspection {
  const svg = bytes.toString("utf8");
  const width = parseSvgLength(svg, "width");
  const height = parseSvgLength(svg, "height");
  const viewBox = svg.match(/viewBox\s*=\s*["']([\d.\s-]+)["']/i)?.[1];
  const viewParts = viewBox?.trim().split(/[\s,]+/).map(Number) ?? [];
  const vbWidth = viewParts[2];
  const vbHeight = viewParts[3];

  const resolvedWidth = width ?? vbWidth ?? null;
  const resolvedHeight = height ?? vbHeight ?? null;

  return {
    ...base,
    width: resolvedWidth ? Math.round(resolvedWidth) : null,
    height: resolvedHeight ? Math.round(resolvedHeight) : null,
    aspectRatio:
      resolvedWidth && resolvedHeight ? resolvedWidth / resolvedHeight : null,
    hasTransparency: !/fill=["'](?!none|#fff|#ffffff|white)/i.test(svg)
      ? true
      : true,
    hasVectorContent: /<(path|polygon|polyline|rect|circle|ellipse|g)\b/i.test(
      svg,
    ),
    hasEmbeddedImages: /<image\b/i.test(svg),
    compatibleOperations: svgOps,
    warnings: /<image\b/i.test(svg)
      ? [...base.warnings, "Este SVG contém imagens raster incorporadas."]
      : base.warnings,
  };
}

async function inspectPdf(
  bytes: Buffer,
  base: FileInspection,
): Promise<FileInspection> {
  try {
    const document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    if (document.isEncrypted) {
      throw new VetorError(
        "pdf_protected",
        "Este PDF está protegido por senha e não pode ser processado.",
      );
    }

    const pageCount = document.getPageCount();
    if (pageCount > limits.maxPdfPages) {
      throw new VetorError(
        "pdf_too_many_pages",
        `O PDF tem ${pageCount} páginas. O limite atual é ${limits.maxPdfPages}.`,
      );
    }

    const first = document.getPage(0);
    const { width, height } = first.getSize();

    return {
      ...base,
      width: Math.round(width),
      height: Math.round(height),
      aspectRatio: width / height,
      pageCount,
      hasVectorContent: true,
      hasEmbeddedImages: null,
      compatibleOperations: pdfOps,
    };
  } catch (error) {
    if (error instanceof VetorError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (/password|encrypt/i.test(message)) {
      throw new VetorError(
        "pdf_protected",
        "Este PDF está protegido por senha e não pode ser processado.",
      );
    }
    throw new VetorError("invalid_pdf", "O PDF está danificado ou é inválido.");
  }
}

function parseSvgLength(svg: string, attribute: "width" | "height"): number | null {
  const match = svg.match(new RegExp(`${attribute}\\s*=\\s*["']([\\d.]+)`, "i"));
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
