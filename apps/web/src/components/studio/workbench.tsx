"use client";

import type { Asset, ConversionJob, FileInspection, JobOutput, Operation } from "@vetor/contracts";
import {
  AlignHorizontalSpaceAround,
  Columns2,
  Crop,
  Download,
  FolderOpen,
  Frame,
  Hand,
  Image as ImageIcon,
  MousePointer2,
  Spline,
  ZoomIn,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/input";
import { Uploader } from "../uploader";
import { formatBytes, operationLabel, statusLabel } from "@/lib/utils";
import { uploadAsset } from "@/lib/upload-asset";
import { useRouter } from "next/navigation";
import { CanvasStage, type CanvasTool, type CanvasView } from "./canvas-stage";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.avif,.tif,.tiff,.bmp,.svg,.pdf";

export function Workbench({
  asset,
  operation,
  options,
  job,
  outputs,
  error,
  resultUrl,
  onOperation,
  onOptions,
  onConvert,
  onCancel,
}: {
  asset: Asset | null;
  operation: Operation;
  options: Record<string, unknown>;
  job: ConversionJob | null;
  outputs: JobOutput[];
  error: string | null;
  resultUrl: string | null;
  onOperation: (operation: Operation) => void;
  onOptions: (options: Record<string, unknown>) => void;
  onConvert: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const zoomApi = useRef<{ fit: () => void; set: (value: number) => void; zoom: number } | null>(null);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [view, setView] = useState<CanvasView>("original");
  const [menu, setMenu] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inspection = asset?.metadata as FileInspection | undefined;
  const operations = inspection?.compatibleOperations ?? [];

  useEffect(() => {
    if (resultUrl) setView("compare");
  }, [resultUrl]);

  useEffect(() => {
    function close() {
      setMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  async function openFile(file: File) {
    setUploadError(null);
    try {
      const next = await uploadAsset(file);
      router.push(`/app/estudio?asset=${next.id}`);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
    }
  }

  function chooseOperation(next: Operation) {
    if (operations.length && !operations.includes(next)) return;
    onOperation(next);
  }

  const width = asset?.width ?? null;
  const height = asset?.height ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-chrome text-[12px]">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openFile(file);
          event.currentTarget.value = "";
        }}
      />

      <MenuBar
        open={menu}
        onOpen={setMenu}
        canExport={Boolean(resultUrl)}
        onOpenFile={() => fileRef.current?.click()}
        onExport={() => resultUrl && window.open(resultUrl, "_blank")}
        onFit={() => zoomApi.current?.fit()}
        onZoom={(value) => zoomApi.current?.set(value)}
        onCompare={() => {
          setTool("compare");
          setView("compare");
        }}
        onOperation={chooseOperation}
      />

      <PropertyBar
        asset={asset}
        zoom={zoom}
        operation={operation}
        options={options}
        job={job}
        canRun={Boolean(asset)}
        onOptions={onOptions}
        onFit={() => zoomApi.current?.fit()}
        onZoom={(value) => zoomApi.current?.set(value)}
        onConvert={onConvert}
      />

      <div className="flex min-h-0 flex-1">
        <Toolbox
          tool={tool}
          operation={operation}
          operations={operations}
          onTool={setTool}
          onOperation={chooseOperation}
          onOpen={() => fileRef.current?.click()}
          onExport={() => resultUrl && window.open(resultUrl, "_blank")}
          canExport={Boolean(resultUrl)}
        />

        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          <CanvasStage
            originalUrl={asset ? `/api/assets/${asset.id}/file` : undefined}
            resultUrl={resultUrl}
            resultMime={outputs[0]?.mimeType}
            width={width}
            height={height}
            tool={tool === "compare" ? "select" : tool}
            view={tool === "compare" ? "compare" : view}
            processing={job?.status === "processing"}
            emptySlot={<Uploader variant="canvas" />}
            onCursor={setCursor}
            onZoomChange={setZoom}
            onFile={(file) => void openFile(file)}
            zoomRef={zoomApi}
          />
          <PageTabs
            hasResult={Boolean(resultUrl)}
            view={view}
            onView={(next) => {
              setView(next);
              if (next === "compare") setTool("compare");
            }}
          />
        </div>

        <Dockers
          asset={asset}
          inspection={inspection}
          operation={operation}
          operations={operations}
          options={options}
          job={job}
          outputs={outputs}
          error={error ?? uploadError}
          resultUrl={resultUrl}
          view={view}
          onView={setView}
          onOperation={chooseOperation}
          onOptions={onOptions}
          onConvert={onConvert}
          onCancel={onCancel}
        />
      </div>

      <StatusBar asset={asset} job={job} cursor={cursor} zoom={zoom} />
    </div>
  );
}

function MenuBar({
  open,
  onOpen,
  canExport,
  onOpenFile,
  onExport,
  onFit,
  onZoom,
  onCompare,
  onOperation,
}: {
  open: string | null;
  onOpen: (value: string | null) => void;
  canExport: boolean;
  onOpenFile: () => void;
  onExport: () => void;
  onFit: () => void;
  onZoom: (value: number) => void;
  onCompare: () => void;
  onOperation: (operation: Operation) => void;
}) {
  const menus = [
    {
      id: "arquivo",
      label: "Arquivo",
      items: [
        { label: "Abrir...", action: onOpenFile },
        { label: "Exportar resultado", action: onExport, disabled: !canExport },
      ],
    },
    {
      id: "visualizar",
      label: "Visualizar",
      items: [
        { label: "Ajustar à tela", action: onFit },
        { label: "100%", action: () => onZoom(1) },
        { label: "Ampliar", action: () => onZoom(1.25) },
        { label: "Reduzir", action: () => onZoom(0.8) },
        { label: "Comparar original e resultado", action: onCompare },
      ],
    },
    {
      id: "objeto",
      label: "Objeto",
      items: [
        { label: "Centralizar", action: () => onOperation("geometry.center") },
        { label: "Remover margens", action: () => onOperation("geometry.trim") },
        { label: "Ajustar prancheta", action: () => onOperation("geometry.canvas") },
        { label: "Vetorizar", action: () => onOperation("vectorize") },
      ],
    },
  ];

  return (
    <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border bg-chrome px-2">
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            type="button"
            className={`h-6 px-2 text-[12px] hover:bg-black/5 dark:hover:bg-white/10 ${open === menu.id ? "bg-black/10 dark:bg-white/10" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(open === menu.id ? null : menu.id);
            }}
          >
            {menu.label}
          </button>
          {open === menu.id ? (
            <div className="absolute top-full left-0 z-40 min-w-56 border border-border bg-card py-1 shadow-lg">
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={"disabled" in item && item.disabled}
                  className="flex h-7 w-full items-center px-3 text-left text-[12px] hover:bg-muted disabled:opacity-40"
                  onClick={(event) => {
                    event.stopPropagation();
                    item.action();
                    onOpen(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PropertyBar({
  asset,
  zoom,
  operation,
  options,
  job,
  canRun,
  onOptions,
  onFit,
  onZoom,
  onConvert,
}: {
  asset: Asset | null;
  zoom: number;
  operation: Operation;
  options: Record<string, unknown>;
  job: ConversionJob | null;
  canRun: boolean;
  onOptions: (options: Record<string, unknown>) => void;
  onFit: () => void;
  onZoom: (value: number) => void;
  onConvert: () => void;
}) {
  const set = (key: string, value: unknown) => onOptions({ ...options, [key]: value });
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-chrome px-2">
      <span className="truncate text-[11px] font-medium">{asset?.originalName ?? "Sem documento"}</span>
      <span className="text-muted-foreground">·</span>
      <Metric label="X" value="0" />
      <Metric label="Y" value="0" />
      <Metric label="L" value={String(asset?.width ?? "—")} />
      <Metric label="A" value={String(asset?.height ?? "—")} />
      {operation === "geometry.canvas" ? (
        <>
          <MetricInput label="Prancheta L" value={Number(options.width ?? 1080)} onChange={(value) => set("width", value)} />
          <MetricInput label="A" value={Number(options.height ?? 1080)} onChange={(value) => set("height", value)} />
        </>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className="h-6 px-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => onZoom(zoom / 1.2)}>
          −
        </button>
        <span className="w-12 text-center font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
        <button type="button" className="h-6 px-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => onZoom(zoom * 1.2)}>
          +
        </button>
        <button type="button" className="h-6 px-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={onFit}>
          Ajustar
        </button>
        <Button type="button" size="sm" className="h-6 px-3 text-[11px]" onClick={onConvert} disabled={!canRun || job?.status === "processing"}>
          {job?.status === "processing" ? `${job.progress}%` : `Aplicar ${operationLabel(operation)}`}
        </Button>
      </div>
    </div>
  );
}

function Toolbox({
  tool,
  operation,
  operations,
  onTool,
  onOperation,
  onOpen,
  onExport,
  canExport,
}: {
  tool: CanvasTool;
  operation: Operation;
  operations: Operation[];
  onTool: (tool: CanvasTool) => void;
  onOperation: (operation: Operation) => void;
  onOpen: () => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const nav = [
    { id: "select" as const, label: "Selecionar", icon: MousePointer2 },
    { id: "pan" as const, label: "Mão / panorâmica", icon: Hand },
    { id: "zoom" as const, label: "Zoom", icon: ZoomIn },
    { id: "compare" as const, label: "Comparar", icon: Columns2 },
  ];
  const ops = [
    { id: "vectorize", label: "Vetorizar", icon: Spline, operation: "vectorize" as const },
    { id: "convert", label: "Converter formato", icon: ImageIcon, operation: "raster.convert" as const },
    { id: "canvas", label: "Ajustar prancheta", icon: Frame, operation: "geometry.canvas" as const },
    { id: "trim", label: "Remover margens", icon: Crop, operation: "geometry.trim" as const },
    { id: "center", label: "Centralizar", icon: AlignHorizontalSpaceAround, operation: "geometry.center" as const },
  ];

  return (
    <aside className="flex w-9 shrink-0 flex-col items-center gap-0.5 border-r border-border bg-chrome py-1">
      {nav.map((item) => (
        <ToolButton key={item.id} label={item.label} active={tool === item.id} onClick={() => onTool(item.id)}>
          <item.icon className="h-3.5 w-3.5" />
        </ToolButton>
      ))}
      <span className="my-1 h-px w-6 bg-border" />
      {ops.map((item) => {
        const allowed = !operations.length || operations.includes(item.operation);
        return (
          <ToolButton
            key={item.id}
            label={item.label}
            active={operation === item.operation}
            disabled={!allowed}
            onClick={() => onOperation(item.operation)}
          >
            <item.icon className="h-3.5 w-3.5" />
          </ToolButton>
        );
      })}
      <span className="my-1 h-px w-6 bg-border" />
      <ToolButton label="Abrir arquivo" onClick={onOpen}>
        <FolderOpen className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton label="Exportar" disabled={!canExport} onClick={onExport}>
        <Download className="h-3.5 w-3.5" />
      </ToolButton>
    </aside>
  );
}

function Dockers({
  asset,
  inspection,
  operation,
  operations,
  options,
  job,
  outputs,
  error,
  resultUrl,
  view,
  onView,
  onOperation,
  onOptions,
  onConvert,
  onCancel,
}: {
  asset: Asset | null;
  inspection?: FileInspection;
  operation: Operation;
  operations: Operation[];
  options: Record<string, unknown>;
  job: ConversionJob | null;
  outputs: JobOutput[];
  error: string | null;
  resultUrl: string | null;
  view: CanvasView;
  onView: (view: CanvasView) => void;
  onOperation: (operation: Operation) => void;
  onOptions: (options: Record<string, unknown>) => void;
  onConvert: () => void;
  onCancel: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-chrome lg:flex">
      <Docker title="Páginas">
        <div className="grid grid-cols-2 gap-2 p-2">
          <PageThumb
            label="Página 1"
            active={view === "original"}
            src={asset ? `/api/assets/${asset.id}/file` : undefined}
            onClick={() => onView("original")}
          />
          <PageThumb
            label="Resultado"
            active={view === "result" || view === "compare"}
            src={resultUrl ?? undefined}
            onClick={() => resultUrl && onView("result")}
          />
        </div>
      </Docker>
      <Docker title="Propriedades do objeto" grow>
        <div className="space-y-3 overflow-y-auto p-3">
          {asset ? (
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <div>Formato: {asset.detectedFormat.toUpperCase()}</div>
              <div>Tamanho: {formatBytes(asset.fileSize)}</div>
              <div>Transparência: {inspection?.hasTransparency ? "sim" : "não"}</div>
              <div>ICC: {inspection?.hasIccProfile ? "sim" : "não"}</div>
              <div>Páginas: {inspection?.pageCount ?? "—"}</div>
              <div>Orientação: {inspection?.orientation ?? "—"}</div>
            </dl>
          ) : (
            <p className="text-[11px] text-muted-foreground">Abra um arquivo para inspecionar o objeto.</p>
          )}
          {inspection?.warnings.map((warning) => (
            <p key={warning} className="text-[11px] text-accent">
              {warning}
            </p>
          ))}
          <div className="space-y-1">
            <Label className="text-[11px]">Operação</Label>
            <select
              className="h-8 w-full rounded-sm border border-border bg-card px-2 text-[12px]"
              value={operation}
              onChange={(event) => onOperation(event.target.value as Operation)}
            >
              {(operations.length ? operations : [operation]).map((item) => (
                <option key={item} value={item}>
                  {operationLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <OptionsForm operation={operation} options={options} onChange={onOptions} />
          {error ? <p className="text-[11px] text-danger">{error}</p> : null}
          {job?.errorMessage ? <p className="text-[11px] text-danger">{job.errorMessage}</p> : null}
          {outputs[0]?.metadata && typeof outputs[0].metadata.fidelityWarning === "string" ? (
            <p className="text-[11px] text-muted-foreground">{String(outputs[0].metadata.fidelityWarning)}</p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Button type="button" className="h-8 text-[12px]" onClick={onConvert} disabled={!asset || job?.status === "processing"}>
              {job?.status === "processing" ? "Processando..." : "Aplicar na prancheta"}
            </Button>
            {job && job.status !== "completed" && job.status !== "cancelled" ? (
              <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
            {resultUrl ? (
              <a
                href={resultUrl}
                download
                className="inline-flex h-8 items-center justify-center rounded-md bg-foreground px-3 text-[12px] font-medium text-background"
              >
                Exportar resultado
              </a>
            ) : null}
          </div>
        </div>
      </Docker>
      <Docker title="Cores">
        <ColorWell options={options} operation={operation} onOptions={onOptions} inspection={inspection} />
      </Docker>
    </aside>
  );
}

function PageTabs({
  hasResult,
  view,
  onView,
}: {
  hasResult: boolean;
  view: CanvasView;
  onView: (view: CanvasView) => void;
}) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-1 border-t border-border bg-chrome px-2">
      <button
        type="button"
        className={`h-6 px-2 text-[11px] ${view === "original" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        onClick={() => onView("original")}
      >
        Página 1
      </button>
      {hasResult ? (
        <>
          <button
            type="button"
            className={`h-6 px-2 text-[11px] ${view === "result" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => onView("result")}
          >
            Resultado
          </button>
          <button
            type="button"
            className={`h-6 px-2 text-[11px] ${view === "compare" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => onView("compare")}
          >
            Comparar
          </button>
        </>
      ) : null}
    </div>
  );
}

function StatusBar({
  asset,
  job,
  cursor,
  zoom,
}: {
  asset: Asset | null;
  job: ConversionJob | null;
  cursor: { x: number; y: number } | null;
  zoom: number;
}) {
  const width = asset?.width ?? 0;
  const height = asset?.height ?? 0;
  const mmW = ((width * 25.4) / 96).toFixed(3);
  const mmH = ((height * 25.4) / 96).toFixed(3);
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between gap-3 overflow-hidden border-t border-border bg-chrome px-3 text-[11px] text-muted-foreground">
      <div className="flex min-w-0 items-center gap-3 truncate">
        <span>
          Largura: {width || "—"} px ({mmW} mm) · Altura: {height || "—"} px ({mmH} mm)
        </span>
        <span>
          Centro: ({(width / 2 || 0).toFixed(2)}, {(height / 2 || 0).toFixed(2)})
        </span>
        {cursor ? (
          <span>
            Cursor: {cursor.x.toFixed(1)}, {cursor.y.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span>{asset ? `${asset.detectedFormat.toUpperCase()} · ${formatBytes(asset.fileSize)}` : "Nenhum objeto"}</span>
        <span>{Math.round(zoom * 100)}%</span>
        {job ? <span>{statusLabel(job.status)}</span> : null}
      </div>
    </footer>
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
  const field = "h-8 w-full rounded-sm border border-border bg-card px-2 text-[12px]";

  if (operation === "vectorize") {
    return (
      <div className="space-y-2">
        <Field label="Modo">
          <select className={field} value={String(options.mode ?? "logo")} onChange={(event) => set("mode", event.target.value)}>
            <option value="logo">Logotipo</option>
            <option value="mono">Monocromático</option>
            <option value="illustration">Ilustração</option>
          </select>
        </Field>
        <Field label="Cores">
          <Input className={field} type="number" min={2} max={64} value={Number(options.colorCount ?? 8)} onChange={(e) => set("colorCount", Number(e.target.value))} />
        </Field>
        <Field label="Detalhe">
          <Input className={field} type="number" min={0} max={1} step={0.05} value={Number(options.detail ?? 0.5)} onChange={(e) => set("detail", Number(e.target.value))} />
        </Field>
      </div>
    );
  }

  if (operation === "svg.rasterize") {
    return (
      <div className="space-y-2">
        <Field label="Largura">
          <Input className={field} type="number" value={Number(options.width ?? 1024)} onChange={(e) => set("width", Number(e.target.value))} />
        </Field>
        <label className="flex items-center gap-2 text-[12px]">
          <input type="checkbox" checked={Boolean(options.transparent ?? true)} onChange={(e) => set("transparent", e.target.checked)} />
          Fundo transparente
        </label>
      </div>
    );
  }

  if (operation === "raster.convert") {
    return (
      <div className="space-y-2">
        <Field label="Formato">
          <select className={field} value={String(options.format ?? "jpg")} onChange={(e) => set("format", e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
            <option value="tiff">TIFF</option>
          </select>
        </Field>
        <Field label="Fundo">
          <Input className={field} value={String(options.background ?? "#ffffff")} onChange={(e) => set("background", e.target.value)} />
        </Field>
        <Field label="Qualidade">
          <Input className={field} type="number" min={1} max={100} value={Number(options.quality ?? 85)} onChange={(e) => set("quality", Number(e.target.value))} />
        </Field>
      </div>
    );
  }

  if (operation === "geometry.center" || operation === "geometry.canvas") {
    return (
      <div className="space-y-2">
        <Field label="Método">
          <select className={field} value={String(options.method ?? "visible")} onChange={(e) => set("method", e.target.value)}>
            <option value="visible">Conteúdo visível</option>
            <option value="geometric">Geométrico</option>
          </select>
        </Field>
        {operation === "geometry.canvas" ? (
          <>
            <Field label="Largura">
              <Input className={field} type="number" value={Number(options.width ?? 1080)} onChange={(e) => set("width", Number(e.target.value))} />
            </Field>
            <Field label="Altura">
              <Input className={field} type="number" value={Number(options.height ?? 1080)} onChange={(e) => set("height", Number(e.target.value))} />
            </Field>
          </>
        ) : null}
      </div>
    );
  }

  return <p className="text-[11px] text-muted-foreground">As opções padrão desta operação já estão prontas.</p>;
}

function ColorWell({
  options,
  operation,
  onOptions,
  inspection,
}: {
  options: Record<string, unknown>;
  operation: Operation;
  onOptions: (options: Record<string, unknown>) => void;
  inspection?: FileInspection;
}) {
  const color = String(options.background ?? "#1e3a8a");
  const swatches = ["#111111", "#ffffff", "#1e3a8a", "#ff5a1f", "#efe6d6", "#17803d"];
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        <span className="h-10 w-10 rounded-sm border border-border" style={{ background: color }} />
        <div className="text-[11px] text-muted-foreground">
          <div>{inspection?.colorSpace ?? "RGB"}</div>
          <div>{color.toUpperCase()}</div>
        </div>
      </div>
      {operation === "raster.convert" ? (
        <div className="flex flex-wrap gap-1">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Cor ${swatch}`}
              className="h-5 w-5 border border-black/20"
              style={{ background: swatch }}
              onClick={() => onOptions({ ...options, background: swatch })}
            />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">A paleta de fundo aparece na conversão raster.</p>
      )}
    </div>
  );
}

function Docker({ title, children, grow }: { title: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <section className={`flex min-h-0 flex-col border-b border-border ${grow ? "flex-1" : ""}`}>
      <h2 className="flex h-7 items-center border-b border-border px-3 text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <div className={grow ? "min-h-0 flex-1 overflow-hidden" : ""}>{children}</div>
    </section>
  );
}

function PageThumb({
  label,
  active,
  src,
  onClick,
}: {
  label: string;
  active: boolean;
  src?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <div className={`flex aspect-[3/4] items-center justify-center overflow-hidden border bg-artboard ${active ? "border-accent" : "border-border"}`}>
        {src ? <img src={src} alt={label} className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">Vazio</span>}
      </div>
      <span className="mt-1 block text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-sm disabled:opacity-30 ${active ? "bg-accent text-accent-foreground" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <span className="inline-flex h-6 min-w-12 items-center border border-border bg-card px-1.5 font-mono text-[11px] text-foreground">
        {value}
      </span>
    </label>
  );
}

function MetricInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-16 border border-border bg-card px-1.5 font-mono text-[11px] text-foreground outline-none"
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      {children}
    </div>
  );
}
