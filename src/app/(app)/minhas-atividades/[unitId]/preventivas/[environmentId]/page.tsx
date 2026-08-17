import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AmbientePreventivaView } from "@/features/maintenance/components/ambiente-preventiva-view";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Preventiva — PMOC+" };

/**
 * A preventiva de um ambiente inteiro (Fase 10) — rota nova porque a tela cobre
 * vários `maintenance_records` de uma vez, coisa que `atender/[maintenanceRecordId]`
 * não comporta. Aquela rota redireciona para cá quando a OS é preventiva, para
 * nenhum link anterior morrer.
 */
export default async function AmbienteDaPreventivaPage(
  props: PageProps<"/minhas-atividades/[unitId]/preventivas/[environmentId]">,
) {
  const { unitId, environmentId } = await props.params;
  await requireUser();

  const canExecute = await hasPermission("execute_work_order");
  if (!canExecute) {
    return (
      <AccessDenied message="Você não tem permissão para executar ordens de serviço." />
    );
  }

  return <AmbientePreventivaView unitId={unitId} environmentId={environmentId} />;
}
