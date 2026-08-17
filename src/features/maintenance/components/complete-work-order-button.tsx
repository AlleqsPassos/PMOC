"use client";

import { useTransition } from "react";
import { FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeWorkOrderOffline } from "@/features/maintenance/offline-actions";

/**
 * Fecha a OS. É um botão, não uma regra automática — decisão do usuário.
 *
 * O risco dessa escolha é conhecido: na Fase 9 uma OS com todo o serviço feito
 * ficou aberta e a técnica não tinha como alcançá-la. Por isso quem renderiza
 * este botão o destaca quando não falta mais nada, em vez de esperar o técnico
 * lembrar.
 */
export function CompleteWorkOrderButton({
  workOrderId,
  title,
}: {
  workOrderId: string;
  title: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await completeWorkOrderOffline(workOrderId);
          toast.success(`${title} concluída.`);
        })
      }
    >
      <FileCheck2 className="size-4" />
      {isPending ? "Concluindo…" : "Concluir OS"}
    </Button>
  );
}
