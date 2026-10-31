import { PdfStudio } from "@/components/pdf/pdf-studio";

export default async function PdfPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-semibold">Ferramentas PDF</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Visualize páginas, extraia, una, reorganize e exporte imagens.
      </p>
      <div className="mt-6">
        <PdfStudio assetId={params.asset} />
      </div>
    </main>
  );
}
