import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { CorretivasUnidadeView } from "@/features/maintenance/components/corretivas-unidade-view";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Corretivas — PMOC+" };

/**
 * Os equipamentos com corretiva em aberto na unidade (Fase 10). Mesmo padrão da
 * página da unidade: o Server Component só faz o gate de permissão, os dados
 * vêm do Dexie para funcionar sem rede, e a fronteira de segurança de verdade
 * é a RLS — o pull só traz as OS deste técnico.
 */
export default async function CorretivasDaUnidadePage(
  props: PageProps<"/minhas-atividades/[unitId]/corretivas">,
) {
  const { unitId } = await props.params;
  await requireUser();

  const canExecute = await hasPermission("execute_work_order");
  if (!canExecute) {
    return (
      <AccessDenied message="Você não tem permissão para executar ordens de serviço." />
    );
  }

  return <CorretivasUnidadeView unitId={unitId} />;
}
