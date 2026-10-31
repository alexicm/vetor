"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
export function Uploader({
  redirectTo = "/app/estudio",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [drag, setDrag] = useState(false);

  async function send(file: File) {
    setError(null);
    setPending(true);
    try {
      const signed = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      }).then((res) => res.json());
      if (!signed.ok) throw new Error(signed.error?.message);
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
      if (!completed.ok) throw new Error(completed.error?.message);
      router.push(`${redirectTo}?asset=${completed.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`rounded-xl border border-dashed p-8 text-center ${drag ? "border-accent bg-accent/5" : "border-border"}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDrag(false);
        const file = event.dataTransfer.files[0];
        if (file) void send(file);
      }}
    >
      <p className="text-sm text-muted-foreground">
        Arraste um PNG, JPG, SVG ou PDF, ou selecione no computador.
      </p>
      <div className="mt-4">
        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground">
          <input
            type="file"
            className="sr-only"
            accept=".png,.jpg,.jpeg,.webp,.avif,.tif,.tiff,.bmp,.svg,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void send(file);
            }}
          />
          {pending ? "Enviando e inspecionando..." : "Selecionar arquivo"}
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
