import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/require-user";
import { getServiceRuntime, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonError } from "@/server/http";
import { limits } from "@vetor/core";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const runtime = getServiceRuntime();
    const asset = await runtime.getAsset(id);
    if (!asset || asset.userId !== user.id) {
      return jsonError("not_found", "Arquivo não encontrado.", 404);
    }
    if (isLocalRuntime()) {
      const bytes = await runtime.readStorage(asset.storagePath);
      return new Response(new Uint8Array(bytes), {
        headers: { "content-type": asset.mimeType },
      });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase.storage
      .from("originals")
      .createSignedUrl(asset.storagePath, limits.signedUrlTtlSeconds);
    if (error || !data) throw error ?? new Error("Não foi possível assinar o arquivo.");
    return Response.redirect(data.signedUrl);
  } catch (error) {
    return handleRouteError(error);
  }
}
