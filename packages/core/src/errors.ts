export class VetorError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VetorError";
    this.code = code;
  }
}

export function toUserError(error: unknown): { code: string; message: string } {
  if (error instanceof VetorError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error && error.message.includes("password")) {
    return {
      code: "pdf_protected",
      message: "Este PDF está protegido por senha e não pode ser processado.",
    };
  }

  return {
    code: "processing_failed",
    message: "Não foi possível processar o arquivo. Verifique o formato e tente novamente.",
  };
}
