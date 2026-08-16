"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPmocDownloadUrl } from "@/features/pmoc/actions";

export function DownloadPmocButton({ pmocId }: { pmocId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await getPmocDownloadUrl(pmocId);
      if (result.error || !result.url) {
        toast.error(result.error ?? "Não foi possível gerar o link de download.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <Download className="size-4" />
      {isPending ? "Gerando link…" : "Baixar PDF"}
    </Button>
  );
}
