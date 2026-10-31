"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadAsset } from "@/lib/upload-asset";
import { cn } from "@/lib/utils";

export function Uploader({
  redirectTo = "/app/estudio",
  variant = "dropzone",
}: {
  redirectTo?: string;
  variant?: "dropzone" | "canvas";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [drag, setDrag] = useState(false);

  async function send(file: File) {
    setError(null);
    setPending(true);
    try {
      const asset = await uploadAsset(file);
      router.push(`${redirectTo}?asset=${asset.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setPending(false);
    }
  }

  const label = pending ? "Enviando e inspecionando..." : "Selecionar arquivo";

  if (variant === "canvas") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center px-8 text-center",
          drag ? "bg-accent/10" : "",
        )}
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
        <p className="text-sm text-neutral-600 dark:text-muted-foreground">
          Arraste um PNG, JPG, SVG ou PDF para a prancheta.
        </p>
        <label className="mt-4 inline-flex h-8 cursor-pointer items-center justify-center rounded-sm bg-accent px-3 text-xs font-medium text-accent-foreground">
          <input
            type="file"
            className="sr-only"
            accept=".png,.jpg,.jpeg,.webp,.avif,.tif,.tiff,.bmp,.svg,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void send(file);
            }}
          />
          {label}
        </label>
        {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
      </div>
    );
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
          {label}
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
