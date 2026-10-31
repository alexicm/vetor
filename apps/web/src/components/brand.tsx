import Link from "next/link";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        className={`inline-flex items-center justify-center bg-accent text-accent-foreground ${compact ? "h-5 w-5 rounded-sm text-[10px]" : "h-7 w-7 rounded-md text-xs"}`}
      >
        V
      </span>
      VETOR
    </Link>
  );
}
