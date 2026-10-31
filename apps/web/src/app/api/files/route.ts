import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/server/require-user";
import { dataDir, getLocalStore } from "@/server/runtime";
import { jsonError } from "@/server/http";

export async function GET(request: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return jsonError("unauthorized", "Faça login para continuar.", 401);
  const url = new URL(request.url);
  const storagePath = url.searchParams.get("path");
  if (!storagePath || storagePath.includes("..")) {
    return jsonError("invalid_path", "Caminho inválido.");
  }
  const store = getLocalStore();
  const asset = (await store.listAssets(user.id)).find((item) => item.storagePath === storagePath);
  const jobs = await store.listJobs(user.id);
  const outputs = (
    await Promise.all(jobs.map((job) => store.listOutputs(job.id)))
  ).flat();
  const owned = asset || outputs.some((output) => output.storagePath === storagePath);
  if (!owned) return jsonError("forbidden", "Arquivo não encontrado.", 403);
  const bytes = await readFile(path.join(dataDir(), storagePath));
  return new Response(bytes, {
    headers: {
      "content-type": url.searchParams.get("mime") ?? "application/octet-stream",
      "cache-control": "private, max-age=60",
    },
  });
}
