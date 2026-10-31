import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";

export default function RecoverPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold">Recuperar acesso</h1>
      <p className="mt-2 text-sm text-muted-foreground">Informe o e-mail da sua conta.</p>
      <div className="mt-8">
        <AuthForm mode="recuperar" />
      </div>
    </main>
  );
}
