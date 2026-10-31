import type { Asset, ConversionJob, JobOutput } from "@vetor/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtraAssetInput } from "../types";
import type { JobRuntime } from "../jobs/runtime";

interface SupabaseStoreOptions {
  client: SupabaseClient;
  originalsBucket?: string;
  outputsBucket?: string;
  queueName?: string;
}

export class SupabaseStore implements JobRuntime {
  private readonly originalsBucket: string;
  private readonly outputsBucket: string;
  private readonly queueName: string;

  constructor(private readonly options: SupabaseStoreOptions) {
    this.originalsBucket = options.originalsBucket ?? "originals";
    this.outputsBucket = options.outputsBucket ?? "outputs";
    this.queueName = options.queueName ?? process.env.VETOR_QUEUE_NAME ?? "conversion_jobs";
  }

  private get client() {
    return this.options.client;
  }

  async getJob(jobId: string) {
    const { data, error } = await this.client
      .from("conversion_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapJob(data) : null;
  }

  async getAsset(assetId: string) {
    const { data, error } = await this.client
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapAsset(data) : null;
  }

  async claimJob(jobId: string) {
    const { data, error } = await this.client
      .from("conversion_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        progress: 5,
      })
      .eq("id", jobId)
      .in("status", ["queued"])
      .select("id");
    if (error) throw error;
    return Boolean(data?.length);
  }

  async updateJob(jobId: string, patch: Partial<ConversionJob>) {
    const { error } = await this.client
      .from("conversion_jobs")
      .update({
        status: patch.status,
        progress: patch.progress,
        attempts: patch.attempts,
        error_code: patch.errorCode,
        error_message: patch.errorMessage,
        started_at: patch.startedAt,
        completed_at: patch.completedAt,
      })
      .eq("id", jobId);
    if (error) throw error;
  }

  async addEvent(jobId: string, type: string, message: string) {
    const { error } = await this.client.from("job_events").insert({
      job_id: jobId,
      type,
      message,
    });
    if (error) throw error;
  }

  async readStorage(storagePath: string) {
    const { data, error } = await this.client.storage
      .from(this.originalsBucket)
      .download(storagePath);
    if (error || !data) throw error ?? new Error("Arquivo não encontrado.");
    return Buffer.from(await data.arrayBuffer());
  }

  async writeOutput(input: {
    jobId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    width: number | null;
    height: number | null;
    metadata: Record<string, unknown>;
  }) {
    const job = await this.getJob(input.jobId);
    if (!job) throw new Error("Job não encontrado.");
    const storagePath = `${job.userId}/${input.jobId}/${input.fileName}`;
    const { error: uploadError } = await this.client.storage
      .from(this.outputsBucket)
      .upload(storagePath, input.buffer, {
        contentType: input.mimeType,
        upsert: false,
      });
    if (uploadError && !/already exists/i.test(uploadError.message)) {
      throw uploadError;
    }

    const { data, error } = await this.client
      .from("job_outputs")
      .insert({
        job_id: input.jobId,
        storage_path: storagePath,
        mime_type: input.mimeType,
        file_size: input.buffer.length,
        width: input.width,
        height: input.height,
        metadata: input.metadata,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapOutput(data);
  }

  async listOutputs(jobId: string) {
    const { data, error } = await this.client
      .from("job_outputs")
      .select("*")
      .eq("job_id", jobId);
    if (error) throw error;
    return (data ?? []).map(mapOutput);
  }

  async loadExtraAssets(ids: string[]): Promise<ExtraAssetInput[]> {
    const extras: ExtraAssetInput[] = [];
    for (const id of ids) {
      const asset = await this.getAsset(id);
      if (!asset) continue;
      extras.push({
        id,
        buffer: await this.readStorage(asset.storagePath),
        fileName: asset.originalName,
      });
    }
    return extras;
  }

  async enqueue(job: ConversionJob) {
    const { error } = await this.client.rpc("enqueue_conversion_job", {
      payload: {
        jobId: job.id,
        userId: job.userId,
        assetId: job.assetId,
        operation: job.operation,
      },
    });
    if (error) throw error;
  }

  async dequeue() {
    const { data, error } = await this.client.rpc("read_conversion_jobs", {
      visibility_timeout: Number(process.env.VETOR_VISIBILITY_TIMEOUT_SECONDS ?? 180),
      quantity: 1,
    });
    if (error) throw error;
    const message = Array.isArray(data) ? data[0] : data;
    if (!message) return null;
    return {
      jobId: message.message?.jobId ?? message.message?.job_id,
      messageId: String(message.msg_id),
    };
  }

  async ack(messageId?: string) {
    if (!messageId) return;
    const { error } = await this.client.rpc("archive_conversion_job", {
      message_id: Number(messageId),
    });
    if (error) throw error;
  }
}

function mapAsset(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    originalName: String(row.original_name),
    mimeType: String(row.mime_type),
    detectedFormat: row.detected_format as Asset["detectedFormat"],
    storagePath: String(row.storage_path),
    sha256: String(row.sha256),
    fileSize: Number(row.file_size),
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    pageCount: (row.page_count as number | null) ?? null,
    metadata: row.metadata as Asset["metadata"],
    createdAt: String(row.created_at),
  };
}

function mapJob(row: Record<string, unknown>): ConversionJob {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    assetId: String(row.asset_id),
    operation: row.operation as ConversionJob["operation"],
    options: (row.options as Record<string, unknown>) ?? {},
    status: row.status as ConversionJob["status"],
    progress: Number(row.progress ?? 0),
    attempts: Number(row.attempts ?? 0),
    errorCode: (row.error_code as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

function mapOutput(row: Record<string, unknown>): JobOutput {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    storagePath: String(row.storage_path),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size),
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}
