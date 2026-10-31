export const rasterFormats = [
  "png",
  "jpg",
  "webp",
  "avif",
  "tiff",
  "bmp",
] as const;

export const graphicFormats = [...rasterFormats, "svg", "pdf"] as const;

export type RasterFormat = (typeof rasterFormats)[number];
export type GraphicFormat = (typeof graphicFormats)[number];

export const operations = [
  "raster.convert",
  "raster.resize",
  "vectorize",
  "svg.rasterize",
  "svg.optimize",
  "geometry.center",
  "geometry.trim",
  "geometry.canvas",
  "pdf.extract",
  "pdf.merge",
  "pdf.reorder",
  "pdf.rotate",
  "pdf.pagesToImages",
  "pdf.imagesToPdf",
] as const;

export type Operation = (typeof operations)[number];

export const jobStatuses = [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const vectorizeModes = ["logo", "mono", "illustration"] as const;
export type VectorizeMode = (typeof vectorizeModes)[number];

export const fitModes = ["contain", "cover", "resize"] as const;
export type FitMode = (typeof fitModes)[number];

export const centerAxes = ["horizontal", "vertical", "both"] as const;
export type CenterAxis = (typeof centerAxes)[number];
