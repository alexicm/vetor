"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset, ConversionJob, JobOutput, Operation } from "@vetor/contracts";
import { Workbench } from "./workbench";

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
    if (!assetId) {
      setAsset(null);
      return;
    }
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

  const resultUrl = useMemo(() => {
    const output = outputs[0];
    if (!output) return null;
    return output.downloadUrl ?? `/api/files?path=${encodeURIComponent(output.storagePath)}&mime=${encodeURIComponent(output.mimeType)}`;
  }, [outputs]);

  function changeOperation(next: Operation) {
    setOperation(next);
    setOptions(defaultOptions[next] ?? {});
  }

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

  async function cancelJob() {
    if (!job) return;
    await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
  }

  return (
    <Workbench
      asset={asset}
      operation={operation}
      options={options}
      job={job}
      outputs={outputs}
      error={error}
      resultUrl={resultUrl}
      onOperation={changeOperation}
      onOptions={setOptions}
      onConvert={() => void startJob()}
      onCancel={() => void cancelJob()}
    />
  );
}
