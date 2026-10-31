import type {
  PdfExtractOptions,
  PdfImagesToPdfOptions,
  PdfPagesToImagesOptions,
  PdfReorderOptions,
  PdfRotateOptions,
} from "@vetor/contracts";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import sharp from "sharp";
import { VetorError } from "../errors";
import { limits } from "../limits";
import type { EngineResult, ExtraAssetInput } from "../types";

export async function loadPdf(bytes: Buffer) {
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
  if (document.getPageCount() > limits.maxPdfPages) {
    throw new VetorError(
      "pdf_too_many_pages",
      `O PDF ultrapassa o limite de ${limits.maxPdfPages} páginas.`,
    );
  }
  return document;
}

export async function extractPdfPages(
  bytes: Buffer,
  options: PdfExtractOptions,
): Promise<EngineResult> {
  const source = await loadPdf(bytes);
  const output = await PDFDocument.create();
  const indices = normalizePages(options.pages, source.getPageCount());
  const copied = await output.copyPages(source, indices);
  copied.forEach((page) => output.addPage(page));
  const buffer = Buffer.from(await output.save());
  return pdfResult(buffer, "paginas.pdf", { pages: indices.map((i) => i + 1) });
}

export async function mergePdfs(inputs: ExtraAssetInput[]): Promise<EngineResult> {
  const output = await PDFDocument.create();
  for (const input of inputs) {
    const source = await loadPdf(input.buffer);
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((page) => output.addPage(page));
  }
  const buffer = Buffer.from(await output.save());
  return pdfResult(buffer, "combinado.pdf", { documents: inputs.length });
}

export async function reorderPdf(
  bytes: Buffer,
  options: PdfReorderOptions,
): Promise<EngineResult> {
  const source = await loadPdf(bytes);
  const output = await PDFDocument.create();
  const indices = normalizePages(options.order, source.getPageCount());
  if (new Set(indices).size !== source.getPageCount()) {
    throw new VetorError(
      "pdf_invalid_order",
      "A reorganização deve incluir todas as páginas, sem repetir.",
    );
  }
  const copied = await output.copyPages(source, indices);
  copied.forEach((page) => output.addPage(page));
  const buffer = Buffer.from(await output.save());
  return pdfResult(buffer, "reorganizado.pdf", { order: indices.map((i) => i + 1) });
}

export async function rotatePdfPages(
  bytes: Buffer,
  options: PdfRotateOptions,
): Promise<EngineResult> {
  const document = await loadPdf(bytes);
  const indices = normalizePages(options.pages, document.getPageCount());
  for (const index of indices) {
    const page = document.getPage(index);
    page.setRotation(degrees((page.getRotation().angle + options.degrees) % 360));
  }
  const buffer = Buffer.from(await document.save());
  return pdfResult(buffer, "rotacionado.pdf", {
    pages: indices.map((i) => i + 1),
    degrees: options.degrees,
  });
}

export async function imagesToPdf(
  images: ExtraAssetInput[],
  options: PdfImagesToPdfOptions,
): Promise<EngineResult> {
  const document = await PDFDocument.create();
  for (const image of images) {
    const png = await sharp(image.buffer).rotate().png().toBuffer();
    const embedded = await document.embedPng(png);
    const width = options.pageWidth ?? embedded.width;
    const height = options.pageHeight ?? embedded.height;
    const page = document.addPage([width, height]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
    });
    const scale = Math.min(width / embedded.width, height / embedded.height);
    const drawWidth = embedded.width * scale;
    const drawHeight = embedded.height * scale;
    page.drawImage(embedded, {
      x: (width - drawWidth) / 2,
      y: (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }
  const buffer = Buffer.from(await document.save());
  return pdfResult(buffer, "imagens.pdf", { images: images.length });
}

export async function pdfPagesToImages(
  bytes: Buffer,
  options: PdfPagesToImagesOptions,
): Promise<EngineResult[]> {
  const document = await loadPdf(bytes);
  const pageCount = document.getPageCount();
  const pages = options.pages
    ? normalizePages(options.pages, pageCount)
    : Array.from({ length: pageCount }, (_, index) => index);

  const pdfjs = await loadPdfJs();
  const loading = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
  } as never);
  const pdf = await loading.promise;
  const results: EngineResult[] = [];

  for (const index of pages) {
    const page = await pdf.getPage(index + 1);
    const viewport = page.getViewport({ scale: options.scale });
    const { createCanvas } = await import("@napi-rs/canvas");
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    } as never).promise;

    let buffer: Buffer = Buffer.from(canvas.toBuffer("image/png"));
    if (options.format === "jpg") {
      buffer = Buffer.from(
        await sharp(buffer)
          .flatten({ background: options.background ?? "#ffffff" })
          .jpeg({ quality: 90 })
          .toBuffer(),
      );
    }

    const meta = await sharp(buffer).metadata();
    results.push({
      buffer,
      mimeType: options.format === "jpg" ? "image/jpeg" : "image/png",
      fileName: `pagina-${index + 1}.${options.format}`,
      width: meta.width ?? canvas.width,
      height: meta.height ?? canvas.height,
      metadata: { page: index + 1, scale: options.scale },
    });
  }

  return results;
}

function normalizePages(pages: number[], pageCount: number) {
  return pages.map((page) => {
    if (page < 1 || page > pageCount) {
      throw new VetorError(
        "pdf_invalid_page",
        `A página ${page} não existe neste PDF.`,
      );
    }
    return page - 1;
  });
}

function pdfResult(
  buffer: Buffer,
  fileName: string,
  metadata: Record<string, unknown>,
): EngineResult {
  return {
    buffer,
    mimeType: "application/pdf",
    fileName,
    width: null,
    height: null,
    metadata,
  };
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}
