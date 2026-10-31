import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSessionUser } from "@/server/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-chrome">
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-chrome px-3">
        <div className="flex items-center gap-5">
          <Brand href="/app" compact />
          <nav className="hidden items-center gap-3 text-[12px] md:flex">
            <Link href="/app" className="text-muted-foreground hover:text-foreground">
              Painel
            </Link>
            <Link href="/app/estudio" className="text-muted-foreground hover:text-foreground">
              Mesa de trabalho
            </Link>
            <Link href="/app/pdf" className="text-muted-foreground hover:text-foreground">
              PDF
            </Link>
            <Link href="/app/historico" className="text-muted-foreground hover:text-foreground">
              Histórico
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
