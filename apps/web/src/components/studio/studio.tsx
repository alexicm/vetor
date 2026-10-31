"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset, ConversionJob, FileInspection, JobOutput, Operation } from "@vetor/contracts";
import { Uploader } from "../uploader";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/input";
import { ComparePreview } from "./compare-preview";
import { formatBytes, operationLabel, statusLabel } from "@/lib/utils";

const defaultOptions: Record<string, Record<string, unknown>> = {
  "raster.convert": { format: "jpg", quality: 85, background: "#ffffff" },
  "raster.resize": { width: 1024, height: 1024, fit: "contain", format: "png" },
  vectorize: { mode: "logo", colorCount: 8, detail: 0.55, simplify: 1 },
  "svg.rasterize": { width: 1024, transparent: true, lockAspect: true },
  "svg.optimize": { multipass: true },
  "geometry.center": { axis: "both", method: "visible" },
  "geometry.trim": { tolerance: 8, padding: 0 },
  "geometry.canvas": { width: 1080, height: 1080, method: "visible" },
};

export function Studio({ assetId }: { assetId?: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [operation, setOperation] = useState<Operation>("vectorize");
  const [options, setOptions] = useState<Record<string, unknown>>(defaultOptions.vectorize ?? {});
  const [job, setJob] = useState<ConversionJob | null>(null);
  const [outputs, setOutputs] = useState<JobOutput[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    void fetch("/api/assets")
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) return;
        const found = (json.data as Asset[]).find((item) => item.id === assetId) ?? null;
        setAsset(found);
        const first = found?.metadata.compatibleOperations[0];
        if (first) {
          setOperation(first);
          setOptions(defaultOptions[first] ?? {});
        }
      });
  }, [assetId]);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return;
    }
    const timer = window.setInterval(async () => {
      const json = await fetch(`/api/jobs/${job.id}`).then((res) => res.json());
      if (!json.ok) return;
      setJob(json.data.job);
      const listed = await fetch(`/api/jobs/${job.id}/outputs`).then((res) => res.json());
      setOutputs(listed.ok ? listed.data : json.data.outputs ?? []);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [job]);

  const inspection = asset?.metadata as FileInspection | undefined;
  const operations = inspection?.compatibleOperations ?? [];
  const resultUrl = useMemo(() => {
    const output = outputs[0];
    if (!output) return null;
    return output.downloadUrl ?? `/api/files?path=${encodeURIComponent(output.storagePath)}&mime=${encodeURIComponent(output.mimeType)}`;
  }, [outputs]);

  async function startJob() {
    if (!asset) return;
    setError(null);
    setOutputs([]);
    const json = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: asset.id, operation, options }),
    }).then((res) => res.json());
    if (!json.ok) {
      setError(json.error?.message ?? "Não foi possível criar o job.");
      return;
    }
    setJob(json.data);
  }

  if (!assetId || !asset) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Estúdio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Envie um arquivo para inspecionar e converter.
        </p>
        <div className="mt-6">
          <Uploader />
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_320px]">
      <section className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">{asset.originalName}</h1>
            <p className="text-xs text-muted-foreground">
              {asset.detectedFormat.toUpperCase()} · {asset.width}×{asset.height} · {formatBytes(asset.fileSize)}
            </p>
          </div>
          {job ? (
            <p className="text-sm">
              {statusLabel(job.status)} {job.status === "processing" ? `· ${job.progress}%` : ""}
            </p>
          ) : null}
        </div>
        <ComparePreview
          originalUrl={`/api/assets/${asset.id}/file`}
          resultUrl={resultUrl}
          resultMime={outputs[0]?.mimeType}
        />
      </section>
      <aside className="overflow-y-auto p-4">
        <h2 className="text-sm font-semibold">Inspeção</h2>
        <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div>Transparência: {inspection?.hasTransparency ? "sim" : "não"}</div>
          <div>Perfil ICC: {inspection?.hasIccProfile ? "presente" : "ausente"}</div>
          <div>Orientação: {inspection?.orientation ?? "—"}</div>
          <div>Páginas: {inspection?.pageCount ?? "—"}</div>
        </dl>
        {inspection?.warnings.map((warning) => (
          <p key={warning} className="mt-2 text-xs text-accent">
            {warning}
          </p>
        ))}
        <div className="mt-6 space-y-2">
          <Label htmlFor="operation">Operação</Label>
          <select
            id="operation"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={operation}
            onChange={(event) => {
              const next = event.target.value as Operation;
              setOperation(next);
              setOptions(defaultOptions[next] ?? {});
            }}
          >
            {operations.map((item) => (
              <option key={item} value={item}>
                {operationLabel(item)}
              </option>
            ))}
          </select>
        </div>
        <OptionsForm operation={operation} options={options} onChange={setOptions} />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {job?.errorMessage ? <p className="mt-3 text-sm text-danger">{job.errorMessage}</p> : null}
        {outputs[0]?.metadata && typeof outputs[0].metadata.fidelityWarning === "string" ? (
          <p className="mt-3 text-xs text-muted-foreground">{String(outputs[0].metadata.fidelityWarning)}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" onClick={() => void startJob()} disabled={job?.status === "processing"}>
            {job?.status === "processing" ? "Processando..." : "Converter"}
          </Button>
          {job && job.status !== "completed" && job.status !== "cancelled" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" })}
            >
              Cancelar
            </Button>
          ) : null}
          {resultUrl ? (
            <a
              href={resultUrl}
              download
              className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
            >
              Exportar resultado
            </a>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function OptionsForm({
  operation,
  options,
  onChange,
}: {
  operation: Operation;
  options: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...options, [key]: value });

  if (operation === "vectorize") {
    return (
      <div className="mt-4 space-y-3">
        <Field label="Modo">
          <select
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={String(options.mode ?? "logo")}
            onChange={(event) => set("mode", event.target.value)}
          >
            <option value="logo">Logotipo</option>
            <option value="mono">Monocromático</option>
            <option value="illustration">Ilustração</option>
          </select>
        </Field>
        <Field label="Cores">
          <Input type="number" min={2} max={64} value={Number(options.colorCount ?? 8)} onChange={(e) => set("colorCount", Number(e.target.value))} />
        </Field>
        <Field label="Detalhe">
          <Input type="number" min={0} max={1} step={0.05} value={Number(options.detail ?? 0.5)} onChange={(e) => set("detail", Number(e.target.value))} />
        </Field>
      </div>
    );
  }

  if (operation === "svg.rasterize") {
    return (
      <div className="mt-4 space-y-3">
        <Field label="Largura">
          <Input type="number" value={Number(options.width ?? 1024)} onChange={(e) => set("width", Number(e.target.value))} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(options.transparent ?? true)} onChange={(e) => set("transparent", e.target.checked)} />
          Fundo transparente
        </label>
      </div>
    );
  }

  if (operation === "raster.convert") {
    return (
      <div className="mt-4 space-y-3">
        <Field label="Formato">
          <select className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" value={String(options.format ?? "jpg")} onChange={(e) => set("format", e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
            <option value="tiff">TIFF</option>
          </select>
        </Field>
        <Field label="Fundo">
          <Input value={String(options.background ?? "#ffffff")} onChange={(e) => set("background", e.target.value)} />
        </Field>
        <Field label="Qualidade">
          <Input type="number" min={1} max={100} value={Number(options.quality ?? 85)} onChange={(e) => set("quality", Number(e.target.value))} />
        </Field>
      </div>
    );
  }

  if (operation === "geometry.center" || operation === "geometry.canvas") {
    return (
      <div className="mt-4 space-y-3">
        <Field label="Método">
          <select className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" value={String(options.method ?? "visible")} onChange={(e) => set("method", e.target.value)}>
            <option value="visible">Conteúdo visível</option>
            <option value="geometric">Geométrico</option>
          </select>
        </Field>
        {operation === "geometry.canvas" ? (
          <>
            <Field label="Largura"><Input type="number" value={Number(options.width ?? 1080)} onChange={(e) => set("width", Number(e.target.value))} /></Field>
            <Field label="Altura"><Input type="number" value={Number(options.height ?? 1080)} onChange={(e) => set("height", Number(e.target.value))} /></Field>
          </>
        ) : null}
      </div>
    );
  }

  return <p className="mt-4 text-xs text-muted-foreground">As opções padrão desta operação já estão prontas.</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
