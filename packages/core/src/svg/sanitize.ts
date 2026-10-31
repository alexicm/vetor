import { VetorError } from "../errors";

const forbidden = [
  /<script\b/i,
  /<foreignobject\b/i,
  /<iframe\b/i,
  /<embed\b/i,
  /<object\b/i,
  /\bon[a-z]+\s*=/i,
  /javascript:/i,
  /data:text\/html/i,
];

export function assertSafeSvg(svg: string) {
  for (const pattern of forbidden) {
    if (pattern.test(svg)) {
      throw new VetorError(
        "svg_unsafe",
        "O SVG contém scripts ou referências bloqueadas e não pode ser processado.",
      );
    }
  }

  const hrefs = [...svg.matchAll(/(?:href|xlink:href)\s*=\s*["']([^"']+)["']/gi)];
  for (const match of hrefs) {
    const value = match[1] ?? "";
    if (/^(https?:|\/\/|file:)/i.test(value)) {
      throw new VetorError(
        "svg_unsafe",
        "O SVG referencia recursos externos e foi bloqueado.",
      );
    }
  }
}

export function sanitizeSvg(svg: string): string {
  assertSafeSvg(svg);
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "");
}

export function hasRealVectorPaths(svg: string): boolean {
  return /<(path|polygon|polyline|rect|circle|ellipse|line)\b/i.test(svg);
}

export function embedsRasterImage(svg: string): boolean {
  return /<image\b/i.test(svg) && /data:image\//i.test(svg);
}
