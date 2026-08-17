import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { PreventivasUnidadeView } from "@/features/maintenance/components/preventivas-unidade-view";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Preventivas — PMOC+" };

/**
 * Os locais com preventiva em aberto na unidade (Fase 10). Gate de permissão no
 * servidor, dados do Dexie no cliente — mesmo padrão das outras telas de campo.
 */
export default async function PreventivasDaUnidadePage(
  props: PageProps<"/minhas-atividades/[unitId]/preventivas">,
) {
  const { unitId } = await props.params;
  await requireUser();

  const canExecute = await hasPermission("execute_work_order");
  if (!canExecute) {
    return (
      <AccessDenied message="Você não tem permissão para executar ordens de serviço." />
    );
  }

  return <PreventivasUnidadeView unitId={unitId} />;
}
