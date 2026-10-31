import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/require-user";
import { getLocalStore, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonOk } from "@/server/http";

export async function GET() {
  try {
    const user = await requireUser();
    if (isLocalRuntime()) {
      return jsonOk(await getLocalStore().listAssets(user.id));
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return jsonOk(
      (data ?? []).map((row) => ({
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
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
