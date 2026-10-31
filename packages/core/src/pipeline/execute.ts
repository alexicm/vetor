import type { Operation } from "@vetor/contracts";
import {
  geometryCanvasOptionsSchema,
  geometryCenterOptionsSchema,
  geometryTrimOptionsSchema,
  pdfExtractOptionsSchema,
  pdfImagesToPdfOptionsSchema,
  pdfPagesToImagesOptionsSchema,
  pdfReorderOptionsSchema,
  pdfRotateOptionsSchema,
  rasterConvertOptionsSchema,
  rasterResizeOptionsSchema,
  svgOptimizeOptionsSchema,
  svgRasterizeOptionsSchema,
  vectorizeOptionsSchema,
} from "@vetor/contracts";
import { VetorError } from "../errors";
import { fitToCanvas, centerContent, trimTransparent } from "../geometry/index";
import { inspectFile } from "../inspect/index";
import {
  extractPdfPages,
  imagesToPdf,
  mergePdfs,
  pdfPagesToImages,
  reorderPdf,
  rotatePdfPages,
} from "../pdf/index";
import { convertRaster, resizeRaster } from "../raster/index";
import { optimizeSvg, rasterizeSvg } from "../svg/rasterize";
import type { EngineResult, ExtraAssetInput } from "../types";
import { vectorizeImage } from "../vectorize/index";

export async function executeOperation(input: {
  operation: Operation;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  options: Record<string, unknown>;
  extras?: ExtraAssetInput[];
}): Promise<EngineResult[]> {
  const inspection = await inspectFile(input.buffer, input.fileName, input.mimeType);
  if (!inspection.compatibleOperations.includes(input.operation)) {
    throw new VetorError(
      "incompatible_operation",
      "Esta operação não é compatível com o arquivo enviado.",
    );
  }

  switch (input.operation) {
    case "raster.convert":
      return [
        await convertRaster(input.buffer, rasterConvertOptionsSchema.parse(input.options)),
      ];
    case "raster.resize":
      return [
        await resizeRaster(input.buffer, rasterResizeOptionsSchema.parse(input.options)),
      ];
    case "vectorize":
      return [
        await vectorizeImage(input.buffer, vectorizeOptionsSchema.parse(input.options)),
      ];
    case "svg.rasterize":
      return [
        await rasterizeSvg(input.buffer, svgRasterizeOptionsSchema.parse(input.options)),
      ];
    case "svg.optimize":
      svgOptimizeOptionsSchema.parse(input.options);
      return [await optimizeSvg(input.buffer)];
    case "geometry.center":
      return [
        await centerContent(
          input.buffer,
          inspection.mimeType,
          geometryCenterOptionsSchema.parse(input.options),
        ),
      ];
    case "geometry.trim":
      return [
        await trimTransparent(
          input.buffer,
          inspection.mimeType,
          geometryTrimOptionsSchema.parse(input.options),
        ),
      ];
    case "geometry.canvas":
      return [
        await fitToCanvas(
          input.buffer,
          inspection.mimeType,
          geometryCanvasOptionsSchema.parse(input.options),
        ),
      ];
    case "pdf.extract":
      return [
        await extractPdfPages(input.buffer, pdfExtractOptionsSchema.parse(input.options)),
      ];
    case "pdf.merge":
      return [await mergePdfs([toInput(input), ...(input.extras ?? [])])];
    case "pdf.reorder":
      return [await reorderPdf(input.buffer, pdfReorderOptionsSchema.parse(input.options))];
    case "pdf.rotate":
      return [await rotatePdfPages(input.buffer, pdfRotateOptionsSchema.parse(input.options))];
    case "pdf.pagesToImages":
      return pdfPagesToImages(
        input.buffer,
        pdfPagesToImagesOptionsSchema.parse(input.options),
      );
    case "pdf.imagesToPdf":
      return [
        await imagesToPdf(
          [toInput(input), ...(input.extras ?? [])],
          pdfImagesToPdfOptionsSchema.parse(input.options),
        ),
      ];
    default:
      throw new VetorError("unknown_operation", "Operação não reconhecida.");
  }
}

function toInput(input: {
  buffer: Buffer;
  fileName: string;
}): ExtraAssetInput {
  return { id: "primary", buffer: input.buffer, fileName: input.fileName };
}
