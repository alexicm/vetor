import Link from "next/link";
import { Uploader } from "@/components/uploader";
import { Card } from "@/components/ui/card";
import { getLocalStore, isLocalRuntime } from "@/server/runtime";
import { getSessionUser } from "@/server/auth";
import { formatBytes, operationLabel, statusLabel } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const store = isLocalRuntime() ? getLocalStore() : null;
  const assets = store && user ? await store.listAssets(user.id) : [];
  const jobs = store && user ? await store.listJobs(user.id) : [];

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Painel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Envie um arquivo para inspecionar e abrir no estúdio.
        </p>
      </div>
      <Uploader />
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { href: "/app/estudio", title: "Estúdio", text: "Conversão, vetorização e geometria." },
          { href: "/app/pdf", title: "Ferramentas PDF", text: "Páginas, extração e combinação." },
          { href: "/app/historico", title: "Histórico", text: "Jobs, status e downloads." },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </Card>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Arquivos recentes</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo ainda.</p>
        ) : (
          <div className="grid gap-3">
            {assets.slice(0, 6).map((asset) => (
              <Link
                key={asset.id}
                href={`/app/estudio?asset=${asset.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <span>{asset.originalName}</span>
                <span className="text-muted-foreground">
                  {asset.detectedFormat.toUpperCase()} · {formatBytes(asset.fileSize)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Jobs recentes</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conversão ainda.</p>
        ) : (
          <div className="grid gap-3">
            {jobs.slice(0, 6).map((job) => (
              <Link
                key={job.id}
                href={`/app/historico/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <span>{operationLabel(job.operation)}</span>
                <span className="text-muted-foreground">{statusLabel(job.status)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
