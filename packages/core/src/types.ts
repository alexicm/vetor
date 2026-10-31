export interface EngineResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
}

export interface ExtraAssetInput {
  id: string;
  buffer: Buffer;
  fileName: string;
}
