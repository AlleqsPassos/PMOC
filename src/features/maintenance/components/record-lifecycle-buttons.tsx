"use client";

import { useTransition } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startMaintenanceRecordOffline } from "@/features/maintenance/offline-actions";

/**
 * "Iniciar atividade" — e, desde a Fase 10, é isto que também move a **OS** para
 * "em andamento" (dentro de `startMaintenanceRecordOffline`), para o
 * administrador ver que o trabalho começou. Antes o status da OS não tinha
 * caminho nenhum a partir da tela do técnico.
 *
 * A conclusão saiu daqui: ela agora depende da resolução escolhida no laudo
 * (resolvido / aguardando peça) e vive em `RecordConclusion`.
 */
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

  if (status === "completed") {
    return <p className="text-muted-foreground text-sm">Atendimento concluído.</p>;
  }

  if (startedAt) {
    return <p className="text-muted-foreground text-sm">Atividade em andamento.</p>;
  }

  return (
    <Button
      disabled={isPending}
      onClick={() => startTransition(() => startMaintenanceRecordOffline(recordId))}
    >
      <Play className="size-4" />
      {isPending ? "Iniciando…" : "Iniciar atividade"}
    </Button>
  );
}
