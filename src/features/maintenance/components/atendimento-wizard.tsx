"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { AtendimentoCorretiva } from "@/features/maintenance/components/atendimento-corretiva";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Ponto de entrada do atendimento de um equipamento — ramifica por tipo de OS
 * (Fase 10). Antes era uma tela só, com checklist, medições, fotos, peças e
 * laudo para qualquer manutenção; o trabalho real tem duas formas diferentes.
 *
 * **Corretiva** fica aqui: a rota é "um registro", e a corretiva é exatamente
 * um problema num aparelho.
 *
 * **Preventiva** não cabe nesta rota — o técnico preenche o ambiente inteiro de
 * uma vez, vários registros na mesma tela. Então esta rota redireciona para lá.
 * Redirecionar, em vez de simplesmente quebrar o link, porque a rota antiga
 * está espalhada por telas anteriores e por qualquer atalho que o técnico tenha
 * salvo.
 *
 * O redirecionamento é feito no cliente, a partir do Dexie, e não no servidor:
 * descobrir o tipo da OS no servidor custaria uma consulta com rede, e esta é a
 * tela que precisa abrir em campo sem conexão.
 */
export function AtendimentoWizard({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
  const router = useRouter();

  const target = useLiveQuery(async () => {
    const workOrder = await offlineDb.workOrders.get(workOrderId);
    if (!workOrder) return { kind: "missing" as const };
    if (workOrder.type === "corretiva") return { kind: "corretiva" as const };

    const record = await offlineDb.maintenanceRecords.get(maintenanceRecordId);
    const equipment = record ? await offlineDb.equipment.get(record.equipmentId) : undefined;

    return {
      kind: "preventiva" as const,
      href: equipment
        ? `/minhas-atividades/${workOrder.unitId}/preventivas/${equipment.environmentId}`
        : `/minhas-atividades/${workOrder.unitId}/preventivas`,
    };
  }, [workOrderId, maintenanceRecordId]);

  const redirectTo = target?.kind === "preventiva" ? target.href : null;
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!target) {
    return <p className="text-muted-foreground text-sm">Carregando…</p>;
  }

  if (target.kind === "missing") {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Este atendimento ainda não foi baixado neste dispositivo. Conecte-se à internet e toque no
          ícone de atualizar, ao lado do indicador de sincronização no topo da tela.
        </CardContent>
      </Card>
    );
  }

  if (target.kind === "preventiva") {
    return <p className="text-muted-foreground text-sm">Abrindo a preventiva…</p>;
  }

  return (
    <AtendimentoCorretiva
      workOrderId={workOrderId}
      maintenanceRecordId={maintenanceRecordId}
    />
  );
}
