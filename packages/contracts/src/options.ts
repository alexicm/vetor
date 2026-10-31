import { z } from "zod";
import {
  centerAxes,
  fitModes,
  rasterFormats,
  vectorizeModes,
} from "./formats";

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Use uma cor hexadecimal válida.");

export const rasterConvertOptionsSchema = z.object({
  format: z.enum(rasterFormats),
  quality: z.number().int().min(1).max(100).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  fit: z.enum(fitModes).default("contain"),
  preserveAspect: z.boolean().default(true),
  background: hexColorSchema.optional(),
  dpi: z.number().int().min(72).max(1200).optional(),
  stripMetadata: z.boolean().default(true),
  preserveIcc: z.boolean().default(false),
});

export const rasterResizeOptionsSchema = rasterConvertOptionsSchema.extend({
  format: z.enum(rasterFormats).optional(),
});

export const vectorizeOptionsSchema = z.object({
  mode: z.enum(vectorizeModes).default("logo"),
  colorCount: z.number().int().min(2).max(64).optional(),
  detail: z.number().min(0).max(1).default(0.5),
  smoothing: z.number().min(0).max(1).default(0.5),
  simplify: z.number().min(0).max(4).default(1),
  noiseRemoval: z.number().min(0).max(1).default(0.4),
  dropSmallAreas: z.boolean().default(true),
  preserveAspect: z.boolean().default(true),
  transparentBackground: z.boolean().default(true),
  optimizePaths: z.boolean().default(true),
});

export const svgRasterizeOptionsSchema = z.object({
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  scale: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
  lockAspect: z.boolean().default(true),
  background: hexColorSchema.optional(),
  transparent: z.boolean().default(true),
});

export const svgOptimizeOptionsSchema = z.object({
  multipass: z.boolean().default(true),
});

export const geometryCenterOptionsSchema = z.object({
  axis: z.enum(centerAxes).default("both"),
  method: z.enum(["geometric", "visible"]).default("visible"),
  tolerance: z.number().min(0).max(255).default(8),
  canvasWidth: z.number().int().positive().max(20000).optional(),
  canvasHeight: z.number().int().positive().max(20000).optional(),
  background: hexColorSchema.optional(),
});

export const geometryTrimOptionsSchema = z.object({
  tolerance: z.number().min(0).max(255).default(8),
  padding: z.number().int().min(0).max(2000).default(0),
});

export const geometryCanvasOptionsSchema = z.object({
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  method: z.enum(["geometric", "visible"]).default("visible"),
  tolerance: z.number().min(0).max(255).default(8),
  padding: z.number().int().min(0).max(2000).default(0),
  background: hexColorSchema.optional(),
});

export const pdfPageSelectionSchema = z.object({
  pages: z.array(z.number().int().positive()).min(1).max(30),
});

export const pdfExtractOptionsSchema = pdfPageSelectionSchema;

export const pdfMergeOptionsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(20),
});

export const pdfReorderOptionsSchema = z.object({
  order: z.array(z.number().int().positive()).min(1).max(30),
});

export const pdfRotateOptionsSchema = z.object({
  pages: z.array(z.number().int().positive()).min(1).max(30),
  degrees: z.union([z.literal(90), z.literal(180), z.literal(270)]),
});

export const pdfPagesToImagesOptionsSchema = z.object({
  pages: z.array(z.number().int().positive()).max(30).optional(),
  format: z.enum(["png", "jpg"]).default("png"),
  scale: z.number().min(0.5).max(4).default(2),
  background: hexColorSchema.optional(),
});

export const pdfImagesToPdfOptionsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(30),
  pageWidth: z.number().positive().max(2000).optional(),
  pageHeight: z.number().positive().max(2000).optional(),
});

export type RasterConvertOptions = z.infer<typeof rasterConvertOptionsSchema>;
export type RasterResizeOptions = z.infer<typeof rasterResizeOptionsSchema>;
export type VectorizeOptions = z.infer<typeof vectorizeOptionsSchema>;
export type SvgRasterizeOptions = z.infer<typeof svgRasterizeOptionsSchema>;
export type SvgOptimizeOptions = z.infer<typeof svgOptimizeOptionsSchema>;
export type GeometryCenterOptions = z.infer<typeof geometryCenterOptionsSchema>;
export type GeometryTrimOptions = z.infer<typeof geometryTrimOptionsSchema>;
export type GeometryCanvasOptions = z.infer<typeof geometryCanvasOptionsSchema>;
export type PdfExtractOptions = z.infer<typeof pdfExtractOptionsSchema>;
export type PdfMergeOptions = z.infer<typeof pdfMergeOptionsSchema>;
export type PdfReorderOptions = z.infer<typeof pdfReorderOptionsSchema>;
export type PdfRotateOptions = z.infer<typeof pdfRotateOptionsSchema>;
export type PdfPagesToImagesOptions = z.infer<typeof pdfPagesToImagesOptionsSchema>;
export type PdfImagesToPdfOptions = z.infer<typeof pdfImagesToPdfOptionsSchema>;
