import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { UnidadeTecnicoView } from "@/features/maintenance/components/unidade-tecnico-view";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Unidade — PMOC+" };

/**
 * A unidade pela ótica do técnico (Fase 9): é daqui que ele chega nas
 * preventivas, nas corretivas e nos equipamentos daquele local.
 *
 * O Server Component só faz o gate de permissão — os dados vêm todos do Dexie
 * no client, para a tela funcionar em campo sem rede. A guarda de *escopo*
 * (ter trabalho atribuído nesta unidade) fica no componente, porque depende do
 * mesmo dado local; a fronteira de segurança de verdade continua sendo a RLS,
 * que só entrega a este usuário o que é dele.
 */
export default async function UnidadeDoTecnicoPage(
  props: PageProps<"/minhas-atividades/[unitId]">,
) {
  const { unitId } = await props.params;
  await requireUser();

  const canExecute = await hasPermission("execute_work_order");
  if (!canExecute) {
    return (
      <AccessDenied message="Você não tem permissão para executar ordens de serviço." />
    );
  }

  return <UnidadeTecnicoView unitId={unitId} />;
}
