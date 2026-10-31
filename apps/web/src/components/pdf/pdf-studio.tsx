"use client";

import { useEffect, useState } from "react";
import type { Asset, ConversionJob } from "@vetor/contracts";
import { Uploader } from "../uploader";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/input";
import { statusLabel } from "@/lib/utils";

export function PdfStudio({ assetId }: { assetId?: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [pages, setPages] = useState("1");
  const [order, setOrder] = useState("1,2,3");
  const [job, setJob] = useState<ConversionJob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    void fetch("/api/assets")
      .then((res) => res.json())
      .then((json) => {
        const found = (json.data as Asset[] | undefined)?.find((item) => item.id === assetId);
        setAsset(found ?? null);
        if (found?.pageCount) {
          const sequence = Array.from({ length: found.pageCount }, (_, index) => index + 1);
          setPages(sequence.join(","));
          setOrder(sequence.join(","));
        }
      });
  }, [assetId]);

  useEffect(() => {
    if (!job || ["completed", "failed", "cancelled"].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      const json = await fetch(`/api/jobs/${job.id}`).then((res) => res.json());
      if (!json.ok) return;
      setJob(json.data.job);
      if (json.data.job.status === "completed") {
        const outputs = await fetch(`/api/jobs/${job.id}/outputs`).then((res) => res.json());
        setDownloadUrl(outputs.data?.[0]?.downloadUrl ?? null);
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [job]);

  async function run(operation: "pdf.extract" | "pdf.reorder" | "pdf.pagesToImages") {
    if (!asset) return;
    setError(null);
    const options =
      operation === "pdf.extract"
        ? { pages: pages.split(",").map(Number) }
        : operation === "pdf.reorder"
          ? { order: order.split(",").map(Number) }
          : { pages: pages.split(",").map(Number), format: "png", scale: 2 };
    const json = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: asset.id, operation, options }),
    }).then((res) => res.json());
    if (!json.ok) {
      setError(json.error?.message ?? "Falha ao criar o job.");
      return;
    }
    setJob(json.data);
  }

  if (!asset) {
    return <Uploader redirectTo="/app/pdf" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <iframe title="Prévia do PDF" src={`/api/assets/${asset.id}/file`} className="h-[70vh] w-full" />
      </div>
      <aside className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {asset.originalName} · {asset.pageCount ?? "?"} páginas
        </p>
        <div className="space-y-2">
          <Label>Páginas</Label>
          <Input value={pages} onChange={(event) => setPages(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nova ordem</Label>
          <Input value={order} onChange={(event) => setOrder(event.target.value)} />
        </div>
        <Button type="button" onClick={() => void run("pdf.extract")}>
          Extrair páginas
        </Button>
        <Button type="button" variant="outline" onClick={() => void run("pdf.reorder")}>
          Reorganizar
        </Button>
        <Button type="button" variant="outline" onClick={() => void run("pdf.pagesToImages")}>
          Exportar PNG
        </Button>
        {job ? <p className="text-sm">{statusLabel(job.status)}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {downloadUrl ? (
          <a href={downloadUrl} className="block text-sm text-accent underline">
            Baixar resultado
          </a>
        ) : null}
      </aside>
    </div>
  );
}
