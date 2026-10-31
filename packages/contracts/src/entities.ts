import { z } from "zod";
import { graphicFormats, jobStatuses, operations } from "./formats";
import { inspectionSchema } from "./inspection";

export const assetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  originalName: z.string(),
  mimeType: z.string(),
  detectedFormat: z.enum(graphicFormats),
  storagePath: z.string(),
  sha256: z.string(),
  fileSize: z.number().int().nonnegative(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  pageCount: z.number().int().nullable(),
  metadata: inspectionSchema,
  createdAt: z.string(),
});

export const conversionJobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  assetId: z.string().uuid(),
  operation: z.enum(operations),
  options: z.record(z.string(), z.unknown()),
  status: z.enum(jobStatuses),
  progress: z.number().int().min(0).max(100),
  attempts: z.number().int().nonnegative(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const jobOutputSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  storagePath: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().nonnegative(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  downloadUrl: z.string().optional(),
});

export const jobEventSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  type: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export const queueMessageSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  assetId: z.string().uuid(),
  operation: z.enum(operations),
});

export type Asset = z.infer<typeof assetSchema>;
export type ConversionJob = z.infer<typeof conversionJobSchema>;
export type JobOutput = z.infer<typeof jobOutputSchema>;
export type JobEvent = z.infer<typeof jobEventSchema>;
export type QueueMessage = z.infer<typeof queueMessageSchema>;
