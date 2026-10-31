import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/server/require-user";
import { dataDir, getServiceRuntime, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonError, jsonOk } from "@/server/http";
import { limits } from "@vetor/core";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const runtime = getServiceRuntime();
    const job = await runtime.getJob(id);
    if (!job || job.userId !== user.id) {
      return jsonError("not_found", "Job não encontrado.", 404);
    }
    const outputs = await runtime.listOutputs(id);
    const withUrls = await Promise.all(
      outputs.map(async (output) => ({
        ...output,
        downloadUrl: await signedDownload(output.storagePath, output.mimeType),
      })),
    );
    return jsonOk(withUrls);
  } catch (error) {
    return handleRouteError(error);
  }
}

async function signedDownload(storagePath: string, mimeType: string) {
  if (isLocalRuntime()) {
    return `/api/files?path=${encodeURIComponent(storagePath)}&mime=${encodeURIComponent(mimeType)}`;
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const bucket = storagePath.includes("/outputs/") || !storagePath.startsWith("originals")
    ? "outputs"
    : "outputs";
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, limits.signedUrlTtlSeconds);
  if (error || !data) throw error ?? new Error("Não foi possível assinar o download.");
  return data.signedUrl;
}

export async function readLocalFile(storagePath: string) {
  return readFile(path.join(dataDir(), storagePath));
}
