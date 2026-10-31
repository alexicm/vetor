import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function operationLabel(operation: string) {
  const labels: Record<string, string> = {
    "raster.convert": "Converter formato",
    "raster.resize": "Redimensionar",
    vectorize: "Vetorizar",
    "svg.rasterize": "Rasterizar SVG",
    "svg.optimize": "Otimizar SVG",
    "geometry.center": "Centralizar",
    "geometry.trim": "Remover margens",
    "geometry.canvas": "Ajustar prancheta",
    "pdf.extract": "Extrair páginas",
    "pdf.merge": "Combinar PDFs",
    "pdf.reorder": "Reorganizar páginas",
    "pdf.rotate": "Rotacionar páginas",
    "pdf.pagesToImages": "PDF para imagens",
    "pdf.imagesToPdf": "Imagens para PDF",
  };
  return labels[operation] ?? operation;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: "Na fila",
    processing: "Processando",
    completed: "Concluído",
    failed: "Falhou",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}
