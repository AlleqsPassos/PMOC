"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reopenMaintenanceRecord } from "@/features/maintenance/actions";

/**
 * "Liberar para o técnico" — o botão que destrava um atendimento fechado como
 * aguardando peça (Fase 12). Enquanto ele não é apertado, o técnico vê o
 * equipamento na divisão de impedimentos, em leitura.
 */
export function ReopenRecordButton({
  recordId,
  workOrderId,
  equipmentTag,
}: {
  recordId: string;
  workOrderId: string;
  equipmentTag: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await reopenMaintenanceRecord(recordId, workOrderId);
          toast.success(`${equipmentTag} liberado para o técnico.`);
        })
      }
    >
      <RotateCcw className="size-4" />
      {isPending ? "Liberando…" : "Liberar para o técnico"}
    </Button>
  );
}
