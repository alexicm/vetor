import { requireUser } from "@/server/require-user";
import { getServiceRuntime } from "@/server/runtime";
import { handleRouteError, jsonError, jsonOk } from "@/server/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const runtime = getServiceRuntime();
    const job = await runtime.getJob(id);
    if (!job || job.userId !== user.id) {
      return jsonError("not_found", "Job não encontrado.", 404);
    }
    if (job.status === "completed") {
      return jsonError("not_cancellable", "Este job já foi concluído.");
    }
    await runtime.updateJob(id, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
      errorMessage: "Cancelado pelo usuário.",
    });
    await runtime.addEvent(id, "cancelled", "Cancelado pelo usuário.");
    return jsonOk({ id, status: "cancelled" });
  } catch (error) {
    return handleRouteError(error);
  }
}
