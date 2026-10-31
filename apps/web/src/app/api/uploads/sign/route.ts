import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { signUploadSchema } from "@vetor/contracts";
import { limits } from "@vetor/core";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/require-user";
import { dataDir, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonError, jsonOk, rateLimit } from "@/server/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    rateLimit(`upload:${user.id}`, 20);
    const input = signUploadSchema.parse(await request.json());
    if (input.fileSize > limits.maxUploadBytes) {
      return jsonError("file_too_large", "O arquivo ultrapassa o limite de 50 MB.", 413);
    }

    const uploadId = randomUUID();
    if (isLocalRuntime()) {
      const tempDir = path.join(dataDir(), "tmp");
      await mkdir(tempDir, { recursive: true });
      await writeFile(path.join(tempDir, `${uploadId}.json`), JSON.stringify({
        userId: user.id,
        fileName: input.fileName,
        contentType: input.contentType,
        fileSize: input.fileSize,
      }));
      return jsonOk({
        uploadId,
        uploadUrl: `/api/uploads/local?uploadId=${uploadId}`,
        method: "PUT",
        headers: { "content-type": input.contentType },
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const storagePath = `${user.id}/${uploadId}-${input.fileName}`;
    const { data, error } = await supabase.storage
      .from("originals")
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      throw error ?? new Error("Não foi possível preparar o envio.");
    }
    return jsonOk({
      uploadId,
      storagePath,
      uploadUrl: data.signedUrl,
      token: data.token,
      method: "PUT",
      headers: { "content-type": input.contentType },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
