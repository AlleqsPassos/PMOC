import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ImpedimentoDetalheView } from "@/features/maintenance/components/impedimento-detalhe-view";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Impedimento — PMOC+" };

/**
 * O impedimento de um equipamento (Fase 14) — rota própria porque um aparelho
 * parado não é um passo da preventiva: é um chamado, e precisa mostrar defeito,
 * fotos, peça e laudo, não medição e checklist da sala inteira.
 *
 * Mesmo padrão das outras telas de campo: gate de permissão no servidor, dados
 * do Dexie no cliente, RLS como fronteira real.
 */
export default async function ImpedimentoDoEquipamentoPage(
  props: PageProps<"/minhas-atividades/[unitId]/impedimentos/[maintenanceRecordId]">,
) {
  const { unitId, maintenanceRecordId } = await props.params;
  await requireUser();

  const canExecute = await hasPermission("execute_work_order");
  if (!canExecute) {
    return (
      <AccessDenied message="Você não tem permissão para executar ordens de serviço." />
    );
  }

  return (
    <ImpedimentoDetalheView unitId={unitId} maintenanceRecordId={maintenanceRecordId} />
  );
}
