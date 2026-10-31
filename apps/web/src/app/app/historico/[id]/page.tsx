import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { getLocalStore, isLocalRuntime } from "@/server/runtime";
import { operationLabel, statusLabel } from "@/lib/utils";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !isLocalRuntime()) notFound();
  const store = getLocalStore();
  const job = await store.getJob(id);
  if (!job || job.userId !== user.id) notFound();
  const outputs = await store.listOutputs(id);
  const events = await store.listEvents(id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/app/historico" className="text-sm text-muted-foreground">
        Voltar
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{operationLabel(job.operation)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{statusLabel(job.status)}</p>
      {job.errorMessage ? <p className="mt-3 text-sm text-danger">{job.errorMessage}</p> : null}
      <section className="mt-8">
        <h2 className="font-semibold">Arquivos gerados</h2>
        {outputs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum arquivo ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {outputs.map((output) => (
              <li key={output.id}>
                <a
                  className="text-sm text-accent underline"
                  href={`/api/files?path=${encodeURIComponent(output.storagePath)}&mime=${encodeURIComponent(output.mimeType)}`}
                >
                  Baixar {output.mimeType} ({output.width ?? "?"}×{output.height ?? "?"})
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="font-semibold">Eventos</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {events.map((event) => (
            <li key={event.id}>
              {new Date(event.createdAt).toLocaleString("pt-BR")} · {event.message}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
