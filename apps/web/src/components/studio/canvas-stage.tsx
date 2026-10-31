"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CanvasTool = "select" | "pan" | "zoom" | "compare";
export type CanvasView = "original" | "result" | "compare";

const RULER = 22;

export function CanvasStage({
  originalUrl,
  resultUrl,
  resultMime,
  width,
  height,
  tool,
  view,
  processing,
  emptySlot,
  onCursor,
  onZoomChange,
  onFile,
  zoomRef,
}: {
  originalUrl?: string;
  resultUrl: string | null;
  resultMime?: string;
  width: number | null;
  height: number | null;
  tool: CanvasTool;
  view: CanvasView;
  processing?: boolean;
  emptySlot?: React.ReactNode;
  onCursor?: (point: { x: number; y: number } | null) => void;
  onZoomChange?: (zoom: number) => void;
  onFile?: (file: File) => void;
  zoomRef?: React.MutableRefObject<{
    fit: () => void;
    set: (value: number) => void;
    zoom: number;
  } | null>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 80, y: 60 });
  const [space, setSpace] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [compare, setCompare] = useState(50);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const compareDrag = useRef(false);

  const artW = width ?? 800;
  const artH = height ?? 600;

  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(8, Math.max(0.05, next));
      setZoom(clamped);
      onZoomChange?.(clamped);
    },
    [onZoomChange],
  );

  const fit = useCallback(() => {
    const availW = Math.max(120, size.w - RULER - 96);
    const availH = Math.max(120, size.h - RULER - 96);
    const next = Math.min(availW / artW, availH / artH, 4);
    applyZoom(next);
    setPan({
      x: (availW - artW * next) / 2 + 48,
      y: (availH - artH * next) / 2 + 48,
    });
  }, [applyZoom, artH, artW, size.h, size.w]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ready = size.w > 40 && size.h > 40;
  useEffect(() => {
    if (!ready) return;
    fit();
    // Só recentra quando o documento ou a área útil inicial muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, originalUrl, artW, artH]);

  useEffect(() => {
    if (!zoomRef) return;
    zoomRef.current = {
      fit,
      set: applyZoom,
      zoom,
    };
  }, [applyZoom, fit, zoom, zoomRef]);

  useEffect(() => {
    function isField(target: EventTarget | null) {
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    }
    function down(event: KeyboardEvent) {
      if (isField(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpace(true);
      }
      if (event.key === "0") fit();
      if (event.key === "+" || event.key === "=") applyZoom(zoom * 1.2);
      if (event.key === "-" || event.key === "_") applyZoom(zoom / 1.2);
    }
    function up(event: KeyboardEvent) {
      if (event.code === "Space") setSpace(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [applyZoom, fit, zoom]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      applyZoom(zoom * (event.deltaY > 0 ? 0.9 : 1.1));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom, zoom]);

  const panning = tool === "pan" || space;

  function pointerToDoc(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (clientX - rect.left - RULER - pan.x) / zoom,
      y: (clientY - rect.top - RULER - pan.y) / zoom,
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (tool === "zoom") {
      applyZoom(event.altKey ? zoom / 1.25 : zoom * 1.25);
      return;
    }
    if (panning) {
      setDragging(true);
      dragOrigin.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    onCursor?.(pointerToDoc(event.clientX, event.clientY));
    if (!dragging) return;
    setPan({
      x: dragOrigin.current.panX + (event.clientX - dragOrigin.current.x),
      y: dragOrigin.current.panY + (event.clientY - dragOrigin.current.y),
    });
  }

  const showResult = Boolean(resultUrl) && view !== "original";
  const showOriginal = view !== "result" || !resultUrl;
  const comparing = view === "compare" && Boolean(resultUrl);

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-workbench select-none",
        panning ? "cursor-grab" : tool === "zoom" ? "cursor-zoom-in" : "cursor-default",
        dragging && "cursor-grabbing",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => {
        setDragging(false);
        compareDrag.current = false;
        onCursor?.(null);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onFile?.(file);
      }}
    >
      <Ruler orientation="horizontal" length={size.w} zoom={zoom} origin={pan.x + RULER} />
      <Ruler orientation="vertical" length={size.h} zoom={zoom} origin={pan.y + RULER} />
      <div className="absolute top-0 left-0 z-20 flex h-[22px] w-[22px] items-center justify-center border-r border-b border-black/20 bg-chrome text-[9px] text-muted-foreground">
        px
      </div>

      <div
        className="absolute z-10 bg-artboard shadow-[0_0_0_1px_rgba(0,0,0,0.18),0_18px_40px_rgba(0,0,0,0.12)]"
        style={{
          left: RULER + pan.x,
          top: RULER + pan.y,
          width: artW * zoom,
          height: artH * zoom,
        }}
      >
        <div className="checkerboard absolute inset-0">
          {originalUrl && showOriginal ? (
            <Preview src={originalUrl} alt="Original" className="absolute inset-0" />
          ) : null}
          {showResult && resultUrl ? (
            <div
              className="absolute inset-0 overflow-hidden"
              style={comparing ? { width: `${compare}%` } : undefined}
            >
              <div
                className="absolute inset-0"
                style={comparing ? { width: `${10000 / compare}%` } : undefined}
              >
                <Preview src={resultUrl} alt="Resultado" mime={resultMime} className="absolute inset-0" />
              </div>
            </div>
          ) : null}
          {!originalUrl ? emptySlot : null}
        </div>

        {tool === "select" && originalUrl ? <SelectionFrame /> : null}

        {comparing ? (
          <div
            role="slider"
            aria-label="Comparar original e resultado"
            aria-valuemin={2}
            aria-valuemax={98}
            aria-valuenow={compare}
            tabIndex={0}
            className="absolute top-0 z-20 h-full w-3 -translate-x-1/2 cursor-ew-resize"
            style={{ left: `${compare}%` }}
            onPointerDown={(event) => {
              event.stopPropagation();
              compareDrag.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!compareDrag.current) return;
              const rect = event.currentTarget.parentElement?.getBoundingClientRect();
              if (!rect) return;
              const next = ((event.clientX - rect.left) / rect.width) * 100;
              setCompare(Math.min(98, Math.max(2, next)));
            }}
            onPointerUp={() => {
              compareDrag.current = false;
            }}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent" />
            <span className="absolute top-1/2 left-1/2 h-8 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent" />
          </div>
        ) : null}

        {processing ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 text-xs font-medium text-white">
            Processando na prancheta...
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SelectionFrame() {
  const handle = "absolute z-20 h-1.5 w-1.5 bg-handle";
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 border border-handle" />
      <span className={`${handle} -top-0.5 -left-0.5`} />
      <span className={`${handle} -top-0.5 left-1/2 -translate-x-1/2`} />
      <span className={`${handle} -top-0.5 -right-0.5`} />
      <span className={`${handle} top-1/2 -left-0.5 -translate-y-1/2`} />
      <span className={`${handle} top-1/2 -right-0.5 -translate-y-1/2`} />
      <span className={`${handle} -bottom-0.5 -left-0.5`} />
      <span className={`${handle} -bottom-0.5 left-1/2 -translate-x-1/2`} />
      <span className={`${handle} -right-0.5 -bottom-0.5`} />
      <span className="absolute top-1/2 left-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-handle">
        <span className="absolute top-1/2 left-0 h-px w-full bg-handle" />
        <span className="absolute top-0 left-1/2 h-full w-px bg-handle" />
      </span>
    </>
  );
}

function Preview({
  src,
  alt,
  mime,
  className,
}: {
  src: string;
  alt: string;
  mime?: string;
  className?: string;
}) {
  if (mime === "application/pdf") {
    return <iframe title={alt} src={src} className={cn("h-full w-full bg-white", className)} />;
  }
  return <img src={src} alt={alt} className={cn("h-full w-full object-contain", className)} />;
}

function Ruler({
  orientation,
  length,
  zoom,
  origin,
}: {
  orientation: "horizontal" | "vertical";
  length: number;
  zoom: number;
  origin: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vertical = orientation === "vertical";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || length <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = vertical ? RULER : length;
    const h = vertical ? length : RULER;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue("--chrome").trim() || "#e8e6e1";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.fillStyle = styles.getPropertyValue("--muted-foreground").trim() || "#5c5c57";
    ctx.font = "9px ui-sans-serif, system-ui, sans-serif";
    ctx.lineWidth = 1;

    const step = zoom >= 2 ? 10 : zoom >= 0.6 ? 50 : 100;
    const start = Math.floor(-origin / (step * zoom)) * step;
    const end = start + length / zoom + step * 4;
    ctx.beginPath();
    for (let value = start; value <= end; value += step) {
      const pos = origin + value * zoom;
      const major = value % (step * 2) === 0;
      if (vertical) {
        ctx.moveTo(major ? 8 : 14, pos);
        ctx.lineTo(RULER, pos);
        if (major && value !== 0) {
          ctx.save();
          ctx.translate(9, pos + 8);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(value), 0, 0);
          ctx.restore();
        }
      } else {
        ctx.moveTo(pos, major ? 8 : 14);
        ctx.lineTo(pos, RULER);
        if (major) ctx.fillText(String(value), pos + 3, 10);
      }
    }
    ctx.stroke();
  }, [length, origin, vertical, zoom]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute z-20", vertical ? "top-0 left-0" : "top-0 left-0")}
      style={{ width: vertical ? RULER : length, height: vertical ? length : RULER }}
    />
  );
}
