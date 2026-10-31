import type { GraphicFormat } from "@vetor/contracts";

const signatures: Array<{
  format: GraphicFormat;
  mime: string;
  match: (bytes: Buffer) => boolean;
}> = [
  {
    format: "png",
    mime: "image/png",
    match: (bytes) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47,
  },
  {
    format: "jpg",
    mime: "image/jpeg",
    match: (bytes) =>
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff,
  },
  {
    format: "webp",
    mime: "image/webp",
    match: (bytes) =>
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    format: "avif",
    mime: "image/avif",
    match: (bytes) => {
      if (bytes.length < 12) return false;
      if (bytes.subarray(4, 8).toString("ascii") !== "ftyp") return false;
      const brand = bytes.subarray(8, 12).toString("ascii");
      return brand === "avif" || brand === "avis" || brand === "mif1";
    },
  },
  {
    format: "tiff",
    mime: "image/tiff",
    match: (bytes) =>
      bytes.length >= 4 &&
      ((bytes[0] === 0x49 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x2a &&
        bytes[3] === 0x00) ||
        (bytes[0] === 0x4d &&
          bytes[1] === 0x4d &&
          bytes[2] === 0x00 &&
          bytes[3] === 0x2a)),
  },
  {
    format: "bmp",
    mime: "image/bmp",
    match: (bytes) =>
      bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d,
  },
  {
    format: "pdf",
    mime: "application/pdf",
    match: (bytes) => bytes.subarray(0, 5).toString("ascii") === "%PDF-",
  },
];

export function detectSignature(bytes: Buffer): {
  format: GraphicFormat;
  mime: string;
} | null {
  for (const signature of signatures) {
    if (signature.match(bytes)) {
      return { format: signature.format, mime: signature.mime };
    }
  }

  const head = bytes.subarray(0, Math.min(bytes.length, 4096)).toString("utf8");
  const trimmed = head.trimStart().toLowerCase();
  if (
    trimmed.startsWith("<svg") ||
    (trimmed.startsWith("<?xml") && trimmed.includes("<svg"))
  ) {
    return { format: "svg", mime: "image/svg+xml" };
  }

  return null;
}

export function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}
