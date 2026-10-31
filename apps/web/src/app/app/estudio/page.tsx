import { Studio } from "@/components/studio/studio";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="h-full overflow-hidden">
      <Studio assetId={params.asset} />
    </main>
  );
}
