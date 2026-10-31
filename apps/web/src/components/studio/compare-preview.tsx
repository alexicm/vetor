"use client";

import { useState } from "react";

export function ComparePreview({
  originalUrl,
  resultUrl,
  resultMime,
}: {
  originalUrl: string;
  resultUrl: string | null;
  resultMime?: string;
}) {
  const [position, setPosition] = useState(50);
  const [scale, setScale] = useState(1);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden checkerboard">
      <div
        className="absolute inset-0 origin-center"
        style={{ transform: `scale(${scale})` }}
      >
        <Preview src={originalUrl} alt="Original" />
        {resultUrl ? (
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
            <div className="absolute inset-0" style={{ width: `${10000 / position}%` }}>
              <Preview src={resultUrl} alt="Resultado" mime={resultMime} />
            </div>
          </div>
        ) : null}
      </div>
      {resultUrl ? (
        <input
          aria-label="Comparar original e resultado"
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="absolute bottom-16 left-4 right-4"
        />
      ) : null}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button type="button" className="rounded-md bg-card px-3 py-1 text-xs" onClick={() => setScale((value) => Math.max(0.25, value - 0.25))}>
          −
        </button>
        <button type="button" className="rounded-md bg-card px-3 py-1 text-xs" onClick={() => setScale(1)}>
          100%
        </button>
        <button type="button" className="rounded-md bg-card px-3 py-1 text-xs" onClick={() => setScale((value) => Math.min(4, value + 0.25))}>
          +
        </button>
      </div>
    </div>
  );
}

function Preview({ src, alt, mime }: { src: string; alt: string; mime?: string }) {
  if (mime === "application/pdf") {
    return <iframe title={alt} src={src} className="h-full w-full bg-white" />;
  }
  if (mime === "image/svg+xml") {
    return (
      // SVG precisa de fundo quadriculado visível
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    );
  }
  return <img src={src} alt={alt} className="h-full w-full object-contain" />;
}
