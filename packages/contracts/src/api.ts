import { z } from "zod";
import { operations } from "./formats";
import {
  geometryCanvasOptionsSchema,
  geometryCenterOptionsSchema,
  geometryTrimOptionsSchema,
  pdfExtractOptionsSchema,
  pdfImagesToPdfOptionsSchema,
  pdfMergeOptionsSchema,
  pdfPagesToImagesOptionsSchema,
  pdfReorderOptionsSchema,
  pdfRotateOptionsSchema,
  rasterConvertOptionsSchema,
  rasterResizeOptionsSchema,
  svgOptimizeOptionsSchema,
  svgRasterizeOptionsSchema,
  vectorizeOptionsSchema,
} from "./options";

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const signUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(127),
  fileSize: z.number().int().positive(),
});

export const completeAssetSchema = z.object({
  uploadId: z.string().min(1),
  originalName: z.string().min(1).max(255),
  declaredMime: z.string().max(127).optional(),
  storagePath: z.string().min(1).optional(),
});

export const jobOptionsSchema = z.union([
  rasterConvertOptionsSchema,
  rasterResizeOptionsSchema,
  vectorizeOptionsSchema,
  svgRasterizeOptionsSchema,
  svgOptimizeOptionsSchema,
  geometryCenterOptionsSchema,
  geometryTrimOptionsSchema,
  geometryCanvasOptionsSchema,
  pdfExtractOptionsSchema,
  pdfMergeOptionsSchema,
  pdfReorderOptionsSchema,
  pdfRotateOptionsSchema,
  pdfPagesToImagesOptionsSchema,
  pdfImagesToPdfOptionsSchema,
]);

export const createJobSchema = z.object({
  assetId: z.string().uuid(),
  operation: z.enum(operations),
  options: z.record(z.string(), z.unknown()).default({}),
});

export const authCredentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export const recoverSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type SignUploadInput = z.infer<typeof signUploadSchema>;
export type CompleteAssetInput = z.infer<typeof completeAssetSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type AuthCredentials = z.infer<typeof authCredentialsSchema>;
