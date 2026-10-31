import { Studio } from "@/components/studio/studio";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="h-[calc(100vh-73px)]">
      <Studio assetId={params.asset} />
    </main>
  );
}
