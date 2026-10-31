import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/server/auth";

const tools = [
  { title: "Vetorização", text: "PNG e JPG viram SVG com paths editáveis, não uma imagem embutida." },
  { title: "Raster profissional", text: "PNG, JPG, WebP, AVIF e TIFF com transparência, qualidade e DPI." },
  { title: "Geometria", text: "Centralize pelo conteúdo visível, recorte margens e ajuste a prancheta." },
  { title: "PDF", text: "Visualize, extraia, una, reorganize e exporte páginas como imagem." },
];

export default async function HomePage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen">
      <SiteHeader signedIn={Boolean(user)} />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Conversão gráfica
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight">
              Do arquivo bruto ao vetor utilizável, sem teatro.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              O VETOR combina a simplicidade de um conversor online com motores reais de
              vetorização, rasterização e PDF. Você vê o original, o resultado e exporta um
              arquivo válido.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={user ? "/app" : "/cadastro"} className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground">
                Começar agora
              </Link>
              <Link href="/login" className="rounded-md border border-border px-5 py-3 text-sm">
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Fluxo principal</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li>1. Envie um PNG, SVG ou PDF</li>
              <li>2. Inspecionamos o arquivo real, não só a extensão</li>
              <li>3. Você escolhe uma operação compatível</li>
              <li>4. O motor processa de verdade e libera o download</li>
            </ol>
          </div>
        </section>
        <section id="ferramentas" className="border-t border-border px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            {tools.map((tool) => (
              <article key={tool.title} className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{tool.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tool.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="formatos" className="border-t border-border px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold">Formatos</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Entrada: PNG, JPG, WebP, AVIF, TIFF, BMP, SVG e PDF. Saída conforme a operação:
              SVG com caminhos, PNG transparente, JPG com fundo definido, WebP, AVIF, TIFF e PDF.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
