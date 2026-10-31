import { z } from "zod";
import { graphicFormats, operations } from "./formats";

export const inspectionSchema = z.object({
  detectedFormat: z.enum(graphicFormats),
  extension: z.string(),
  declaredMime: z.string().nullable(),
  mimeType: z.string(),
  fileSize: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  aspectRatio: z.number().positive().nullable(),
  hasTransparency: z.boolean().nullable(),
  colorSpace: z.string().nullable(),
  hasIccProfile: z.boolean(),
  orientation: z.number().int().nullable(),
  pageCount: z.number().int().positive().nullable(),
  hasVectorContent: z.boolean().nullable(),
  hasEmbeddedImages: z.boolean().nullable(),
  compatibleOperations: z.array(z.enum(operations)),
  warnings: z.array(z.string()),
});

export type FileInspection = z.infer<typeof inspectionSchema>;
