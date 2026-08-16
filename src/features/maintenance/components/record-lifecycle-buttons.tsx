"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  completeMaintenanceRecordOffline,
  startMaintenanceRecordOffline,
} from "@/features/maintenance/offline-actions";

export function RecordLifecycleButtons({
  recordId,
  startedAt,
  status,
}: {
  recordId: string;
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
        onClick={() => startTransition(() => startMaintenanceRecordOffline(recordId))}
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
          await completeMaintenanceRecordOffline(recordId);
          // Não navega pro detalhe da OS (tela de despachante, só online) —
          // volta pra "Minhas atividades", offline-capable, que já reflete
          // o registro sumindo da lista (filtro status=draft).
          router.push("/minhas-atividades");
        })
      }
    >
      {isPending ? "Concluindo…" : "Concluir atendimento"}
    </Button>
  );
}
