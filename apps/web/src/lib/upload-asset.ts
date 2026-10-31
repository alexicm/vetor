export async function uploadAsset(file: File) {
  const signed = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
    }),
  }).then((res) => res.json());
  if (!signed.ok) throw new Error(signed.error?.message ?? "Falha ao preparar o envio.");

  const upload = await fetch(signed.data.uploadUrl, {
    method: signed.data.method ?? "PUT",
    headers: signed.data.headers,
    body: file,
  });
  if (!upload.ok) throw new Error("Falha no envio do arquivo.");

  const completed = await fetch("/api/assets/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      uploadId: signed.data.uploadId,
      originalName: file.name,
      declaredMime: file.type,
      storagePath: signed.data.storagePath,
    }),
  }).then((res) => res.json());
  if (!completed.ok) throw new Error(completed.error?.message ?? "Falha ao inspecionar o arquivo.");
  return completed.data as { id: string };
}
