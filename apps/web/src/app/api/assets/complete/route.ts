import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { completeAssetSchema, type Asset } from "@vetor/contracts";
import { inspectFile } from "@vetor/core";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/require-user";
import { dataDir, getLocalStore, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonOk } from "@/server/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = completeAssetSchema.parse(await request.json());

    if (isLocalRuntime()) {
      const bytes = await readFile(path.join(dataDir(), "tmp", `${input.uploadId}.bin`));
      const inspection = await inspectFile(bytes, input.originalName, input.declaredMime);
      const stored = await getLocalStore().writeOriginal(user.id, input.originalName, bytes);
      const asset: Asset = {
        id: stored.id,
        userId: user.id,
        originalName: input.originalName,
        mimeType: inspection.mimeType,
        detectedFormat: inspection.detectedFormat,
        storagePath: stored.storagePath,
        sha256: stored.sha256,
        fileSize: bytes.length,
        width: inspection.width,
        height: inspection.height,
        pageCount: inspection.pageCount,
        metadata: inspection,
        createdAt: new Date().toISOString(),
      };
      await getLocalStore().createAsset(asset);
      return jsonOk(asset, 201);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const storagePath = input.storagePath ?? input.uploadId;
    const { data, error } = await supabase.storage.from("originals").download(storagePath);
    if (error || !data) throw error ?? new Error("Arquivo não encontrado no armazenamento.");
    const bytes = Buffer.from(await data.arrayBuffer());
    const inspection = await inspectFile(bytes, input.originalName, input.declaredMime);
    const { data: row, error: insertError } = await supabase
      .from("assets")
      .insert({
        id: randomUUID(),
        user_id: user.id,
        original_name: input.originalName,
        mime_type: inspection.mimeType,
        detected_format: inspection.detectedFormat,
        storage_path: storagePath,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        file_size: bytes.length,
        width: inspection.width,
        height: inspection.height,
        page_count: inspection.pageCount,
        metadata: inspection,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;
    return jsonOk(
      {
        id: row.id,
        userId: row.user_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        detectedFormat: row.detected_format,
        storagePath: row.storage_path,
        sha256: row.sha256,
        fileSize: row.file_size,
        width: row.width,
        height: row.height,
        pageCount: row.page_count,
        metadata: row.metadata,
        createdAt: row.created_at,
      },
      201,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
