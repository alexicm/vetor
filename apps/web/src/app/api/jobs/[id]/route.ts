import { requireUser } from "@/server/require-user";
import { getServiceRuntime } from "@/server/runtime";
import { handleRouteError, jsonError, jsonOk } from "@/server/http";

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
    return jsonOk({ job, outputs });
  } catch (error) {
    return handleRouteError(error);
  }
}
