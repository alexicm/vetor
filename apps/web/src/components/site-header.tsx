import Link from "next/link";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Brand />
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/#ferramentas" className="text-muted-foreground hover:text-foreground">
          Ferramentas
        </Link>
        <Link href="/#formatos" className="text-muted-foreground hover:text-foreground">
          Formatos
        </Link>
        <ThemeToggle />
        {signedIn ? (
          <Link href="/app" className="rounded-md bg-accent px-3 py-2 text-accent-foreground">
            Abrir estúdio
          </Link>
        ) : (
          <>
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro" className="rounded-md bg-accent px-3 py-2 text-accent-foreground">
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
