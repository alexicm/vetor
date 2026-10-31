import Link from "next/link";
import { getSessionUser } from "@/server/auth";
import { getLocalStore, isLocalRuntime } from "@/server/runtime";
import { operationLabel, statusLabel } from "@/lib/utils";

export default async function HistoryPage() {
  const user = await getSessionUser();
  const jobs = user && isLocalRuntime() ? await getLocalStore().listJobs(user.id) : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-semibold">Histórico</h1>
      {jobs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum job ainda.</p>
      ) : (
        <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {jobs.map((job) => (
            <Link key={job.id} href={`/app/historico/${job.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{operationLabel(job.operation)}</span>
              <span className="text-muted-foreground">
                {statusLabel(job.status)} · {new Date(job.createdAt).toLocaleString("pt-BR")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
