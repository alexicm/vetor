import type {
  Asset,
  ConversionJob,
  JobOutput,
  Operation,
} from "@vetor/contracts";
import type { ExtraAssetInput } from "../types";

export interface JobRuntime {
  getJob(jobId: string): Promise<ConversionJob | null>;
  getAsset(assetId: string): Promise<Asset | null>;
  claimJob(jobId: string): Promise<boolean>;
  updateJob(
    jobId: string,
    patch: Partial<
      Pick<
        ConversionJob,
        | "status"
        | "progress"
        | "attempts"
        | "errorCode"
        | "errorMessage"
        | "startedAt"
        | "completedAt"
      >
    >,
  ): Promise<void>;
  addEvent(jobId: string, type: string, message: string): Promise<void>;
  readStorage(storagePath: string): Promise<Buffer>;
  writeOutput(input: {
    jobId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    width: number | null;
    height: number | null;
    metadata: Record<string, unknown>;
  }): Promise<JobOutput>;
  listOutputs(jobId: string): Promise<JobOutput[]>;
  loadExtraAssets(ids: string[]): Promise<ExtraAssetInput[]>;
  enqueue(job: ConversionJob): Promise<void>;
  dequeue(): Promise<{ jobId: string; messageId?: string } | null>;
  ack(messageId?: string): Promise<void>;
}

export interface ProcessLogger {
  info(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
}

export function operationNeedsExtras(operation: Operation) {
  return operation === "pdf.merge" || operation === "pdf.imagesToPdf";
}
