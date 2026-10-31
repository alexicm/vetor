export const limits = {
  maxUploadBytes: Number(process.env.VETOR_MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024),
  maxMegapixels: Number(process.env.VETOR_MAX_MEGAPIXELS ?? 100),
  maxPdfPages: Number(process.env.VETOR_MAX_PDF_PAGES ?? 30),
  jobTimeoutMs: Number(process.env.VETOR_JOB_TIMEOUT_MS ?? 180_000),
  maxAttempts: Number(process.env.VETOR_MAX_ATTEMPTS ?? 3),
  signedUrlTtlSeconds: Number(process.env.VETOR_SIGNED_URL_TTL_SECONDS ?? 300),
  visibilityTimeoutSeconds: Number(
    process.env.VETOR_VISIBILITY_TIMEOUT_SECONDS ?? 180,
  ),
};

export function assertFileSize(bytes: number) {
  if (bytes > limits.maxUploadBytes) {
    throw new Error(
      `O arquivo ultrapassa o limite de ${Math.round(limits.maxUploadBytes / (1024 * 1024))} MB.`,
    );
  }
}

export function assertMegapixels(width?: number | null, height?: number | null) {
  if (!width || !height) return;
  const megapixels = (width * height) / 1_000_000;
  if (megapixels > limits.maxMegapixels) {
    throw new Error(
      `A imagem tem ${megapixels.toFixed(1)} megapixels e ultrapassa o limite de ${limits.maxMegapixels}.`,
    );
  }
}
