import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs text-accent-foreground">
        V
      </span>
      VETOR
    </Link>
  );
}
