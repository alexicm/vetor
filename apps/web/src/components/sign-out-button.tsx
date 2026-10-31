"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-[12px]"
      onClick={async () => {
        await fetch("/api/auth/sair", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sair
    </Button>
  );
}
