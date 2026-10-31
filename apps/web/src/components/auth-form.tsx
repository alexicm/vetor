"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input, Label } from "./ui/input";

export function AuthForm({
  mode,
}: {
  mode: "login" | "cadastro" | "recuperar";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const endpoint =
      mode === "login"
        ? "/api/auth/login"
        : mode === "cadastro"
          ? "/api/auth/cadastro"
          : "/api/auth/recuperar";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "recuperar" ? { email: payload.email } : payload),
    });
    const json = await response.json();
    setPending(false);
    if (!json.ok) {
      setError(json.error?.message ?? "Não foi possível continuar.");
      return;
    }
    if (mode === "recuperar") {
      setMessage(json.data.message);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {mode !== "recuperar" ? (
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Aguarde..."
          : mode === "login"
            ? "Entrar"
            : mode === "cadastro"
              ? "Criar conta"
              : "Enviar instruções"}
      </Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            <Link href="/cadastro">Criar conta</Link>
            <Link href="/recuperar">Esqueci a senha</Link>
          </>
        ) : (
          <Link href="/login">Voltar ao login</Link>
        )}
      </div>
    </form>
  );
}
