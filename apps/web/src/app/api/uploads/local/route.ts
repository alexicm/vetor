import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/server/require-user";
import { dataDir } from "@/server/runtime";
import { handleRouteError, jsonError, jsonOk } from "@/server/http";

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const uploadId = new URL(request.url).searchParams.get("uploadId");
    if (!uploadId) return jsonError("missing_upload", "Envio inválido.");
    const metaPath = path.join(dataDir(), "tmp", `${uploadId}.json`);
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as { userId: string };
    if (meta.userId !== user.id) {
      return jsonError("forbidden", "Você não pode enviar este arquivo.", 403);
    }
    const bytes = Buffer.from(await request.arrayBuffer());
    const dest = path.join(dataDir(), "tmp", `${uploadId}.bin`);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
    return jsonOk({ uploadId, bytes: bytes.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
