"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inviteUrl } from "@/features/invites/invite-url";

/** Reenvia o link de um convite já existente — mesma lógica de invite-technician-form.tsx, extraída pra reuso aqui. */
export function CopyInviteLinkButton({ code }: { code: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      toast.success("Link copiado!");
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
      aria-label="Copiar link de convite"
      title="Copiar link"
    >
      <Copy className="size-4" />
    </Button>
  );
}
