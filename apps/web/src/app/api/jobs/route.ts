import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { createJobSchema, type ConversionJob } from "@vetor/contracts";
import { inspectFile, processJob } from "@vetor/core";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/require-user";
import { getLocalStore, getServiceRuntime, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonError, jsonOk, rateLimit } from "@/server/http";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    rateLimit(`job:${user.id}`, 20);
    const input = createJobSchema.parse(await request.json());
    const runtime = getServiceRuntime();
    const asset = await runtime.getAsset(input.assetId);
    if (!asset || asset.userId !== user.id) {
      return jsonError("not_found", "Arquivo não encontrado.", 404);
    }

    const bytes = await runtime.readStorage(asset.storagePath);
    const inspection = await inspectFile(bytes, asset.originalName, asset.mimeType);
    if (!inspection.compatibleOperations.includes(input.operation)) {
      return jsonError(
        "incompatible_operation",
        "Esta operação não é compatível com o arquivo enviado.",
      );
    }

    const job: ConversionJob = {
      id: randomUUID(),
      userId: user.id,
      assetId: asset.id,
      operation: input.operation,
      options: input.options,
      status: "queued",
      progress: 0,
      attempts: 0,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    if (isLocalRuntime()) {
      await getLocalStore().createJob(job);
    } else {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { error } = await supabase.from("conversion_jobs").insert({
        id: job.id,
        user_id: job.userId,
        asset_id: job.assetId,
        operation: job.operation,
        options: job.options,
        status: job.status,
      });
      if (error) throw error;
      await runtime.enqueue(job);
    }

    after(() => processJob(runtime, job.id));
    return jsonOk(job, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
