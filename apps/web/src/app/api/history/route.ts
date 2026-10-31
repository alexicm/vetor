import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/require-user";
import { getLocalStore, isLocalRuntime } from "@/server/runtime";
import { handleRouteError, jsonOk } from "@/server/http";

export async function GET() {
  try {
    const user = await requireUser();
    if (isLocalRuntime()) {
      const store = getLocalStore();
      const jobs = await store.listJobs(user.id);
      const assets = await store.listAssets(user.id);
      return jsonOk({ jobs, assets });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const [{ data: jobs, error: jobsError }, { data: assets, error: assetsError }] =
      await Promise.all([
        supabase
          .from("conversion_jobs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("assets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
    if (jobsError) throw jobsError;
    if (assetsError) throw assetsError;
    return jsonOk({ jobs: jobs ?? [], assets: assets ?? [] });
  } catch (error) {
    return handleRouteError(error);
  }
}
