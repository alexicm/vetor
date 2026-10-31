import { ZodError } from "zod";
import { VetorError } from "@vetor/core";
import { AuthRequiredError } from "./require-user";

export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function jsonError(code: string, message: string, status = 400) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return jsonError("unauthorized", error.message, 401);
  }
  if (error instanceof ZodError) {
    return jsonError("validation_error", error.issues[0]?.message ?? "Dados inválidos.", 422);
  }
  if (error instanceof VetorError) {
    return jsonError(error.code, error.message, 400);
  }
  if (error instanceof Error) {
    return jsonError("request_failed", error.message, 400);
  }
  return jsonError("request_failed", "Não foi possível concluir a solicitação.", 500);
}

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new Error("Muitas tentativas. Aguarde um momento e tente novamente.");
  }
}
