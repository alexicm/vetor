import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold">Criar conta</h1>
      <p className="mt-2 text-sm text-muted-foreground">Comece convertendo arquivos no seu próprio espaço.</p>
      <div className="mt-8">
        <AuthForm mode="cadastro" />
      </div>
    </main>
  );
}
