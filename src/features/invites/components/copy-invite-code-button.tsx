"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia o código de um convite pendente — é o código, não uma URL, que o
 * técnico digita na tela de login. */
export function CopyInviteCodeButton({ code }: { code: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado!");
    } catch {
      toast.error("Não foi possível copiar — copie manualmente.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label="Copiar código do convite"
      title="Copiar código"
    >
      <Copy className="size-4" />
    </Button>
  );
}
