import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AtendimentoWizard } from "@/features/maintenance/components/atendimento-wizard";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Atendimento — PMOC+" };

// Fase 6: a checagem de permissão continua no servidor (fronteira de
// segurança de verdade); os dados do atendimento em si são 100%
// local-first — ver AtendimentoWizard e features/*/offline-actions.ts.
export default async function AtenderPage(
  props: PageProps<"/ordens-servico/[workOrderId]/atender/[maintenanceRecordId]">,
) {
  const { workOrderId, maintenanceRecordId } = await props.params;
  await requireUser();

  const [canExecute, canManage] = await Promise.all([
    hasPermission("execute_work_order"),
    hasPermission("manage_work_orders"),
  ]);
  if (!canExecute && !canManage) {
    return <AccessDenied message="Você não tem permissão para executar ordens de serviço." />;
  }

  return <AtendimentoWizard workOrderId={workOrderId} maintenanceRecordId={maintenanceRecordId} />;
}
