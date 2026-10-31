import { limits } from "../limits";
import { executeOperation } from "../pipeline/execute";
import { toUserError } from "../errors";
import { operationNeedsExtras, type JobRuntime, type ProcessLogger } from "./runtime";

const consoleLogger: ProcessLogger = {
  info: (message, extra) => console.info(JSON.stringify({ level: "info", message, ...extra })),
  error: (message, extra) => console.error(JSON.stringify({ level: "error", message, ...extra })),
};

export async function processJob(
  runtime: JobRuntime,
  jobId: string,
  logger: ProcessLogger = consoleLogger,
) {
  const job = await runtime.getJob(jobId);
  if (!job) {
    logger.error("job_missing", { jobId });
    return;
  }
  if (job.status === "cancelled" || job.status === "completed") {
    return;
  }

  const existing = await runtime.listOutputs(jobId);
  if (existing.length > 0) {
    return;
  }

  const claimed = await runtime.claimJob(jobId);
  if (!claimed) {
    return;
  }

  const started = Date.now();
  await runtime.addEvent(jobId, "started", "Processamento iniciado.");
  await runtime.updateJob(jobId, { progress: 15 });

  try {
    const asset = await runtime.getAsset(job.assetId);
    if (!asset) {
      throw new Error("Arquivo original não encontrado.");
    }

    const buffer = await runtime.readStorage(asset.storagePath);
    await runtime.updateJob(jobId, { progress: 35 });

    const extras = operationNeedsExtras(job.operation)
      ? await runtime.loadExtraAssets(
          Array.isArray(job.options.assetIds) ? (job.options.assetIds as string[]) : [],
        )
      : [];

    const timeout = AbortSignal.timeout(limits.jobTimeoutMs);
    const results = await Promise.race([
      executeOperation({
        operation: job.operation,
        buffer,
        fileName: asset.originalName,
        mimeType: asset.mimeType,
        options: job.options,
        extras,
      }),
      new Promise<never>((_, reject) => {
        timeout.addEventListener("abort", () =>
          reject(new Error("O processamento excedeu o tempo limite.")),
        );
      }),
    ]);

    await runtime.updateJob(jobId, { progress: 80 });

    if (existing.length === 0) {
      for (const result of results) {
        await runtime.writeOutput({
          jobId,
          fileName: result.fileName,
          mimeType: result.mimeType,
          buffer: result.buffer,
          width: result.width,
          height: result.height,
          metadata: result.metadata,
        });
      }
    }

    await runtime.updateJob(jobId, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      errorCode: null,
      errorMessage: null,
    });
    await runtime.addEvent(jobId, "completed", "Conversão concluída.");
    logger.info("job_completed", {
      jobId,
      operation: job.operation,
      durationMs: Date.now() - started,
      outputCount: results.length,
      inputBytes: buffer.length,
    });
  } catch (error) {
    const mapped = toUserError(error);
    const attempts = job.attempts + 1;
    const failedPermanently = attempts >= limits.maxAttempts;
    await runtime.updateJob(jobId, {
      status: failedPermanently ? "failed" : "queued",
      progress: failedPermanently ? 100 : 0,
      attempts,
      errorCode: mapped.code,
      errorMessage: mapped.message,
      completedAt: failedPermanently ? new Date().toISOString() : null,
    });
    await runtime.addEvent(jobId, failedPermanently ? "failed" : "retry", mapped.message);
    logger.error("job_failed", {
      jobId,
      operation: job.operation,
      errorCode: mapped.code,
      attempts,
    });
    if (!failedPermanently) {
      await runtime.enqueue({
        ...job,
        attempts,
        status: "queued",
      });
    }
  }
}
