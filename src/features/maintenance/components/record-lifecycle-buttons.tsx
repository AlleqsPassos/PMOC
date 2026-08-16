"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  completeMaintenanceRecord,
  startMaintenanceRecord,
} from "@/features/maintenance/actions";

export function RecordLifecycleButtons({
  recordId,
  workOrderId,
  startedAt,
  status,
}: {
  recordId: string;
  workOrderId: string;
  startedAt: string | null;
  status: "draft" | "completed";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (status === "completed") {
    return <p className="text-muted-foreground text-sm">Atendimento concluído.</p>;
  }

  if (!startedAt) {
    return (
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await startMaintenanceRecord(recordId, workOrderId);
            router.refresh();
          })
        }
      >
        {isPending ? "Iniciando…" : "Iniciar atendimento"}
      </Button>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await completeMaintenanceRecord(recordId, workOrderId);
          router.push(`/ordens-servico/${workOrderId}`);
        })
      }
    >
      {isPending ? "Concluindo…" : "Concluir atendimento"}
    </Button>
  );
}
