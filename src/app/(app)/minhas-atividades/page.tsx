import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { MinhasAtividadesList } from "@/features/maintenance/components/minhas-atividades-list";
import { FilaDeTrabalho } from "@/features/dispatch/components/fila-de-trabalho";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Início — PMOC+" };

/**
 * Tela inicial do app (Fase 8 — antes era /dashboard). Uma rota, duas visões:
 *
 * - **Despachante** (tem `assign_tickets` ou `manage_work_orders`): fila de
 *   trabalho server-rendered, com a designação embutida em cada linha. É ação
 *   de admin, feita com conectividade — coerente com o escopo offline decidido
 *   na Fase 6, que deixou as telas administrativas só online de propósito.
 * - **Técnico**: a lista local-first de sempre (Dexie/`useLiveQuery`), que
 *   funciona sem rede depois do primeiro pull. Caminho inalterado.
 *
 * A checagem de permissão continua sendo fronteira de segurança server-side;
 * o que muda aqui é só qual componente é renderizado.
 */
export default async function InicioPage() {
  const user = await requireUser();

  const [canViewTickets, canViewWorkOrders, canAssignTickets, canManageWorkOrders] =
    await Promise.all([
      hasPermission("view_tickets"),
      hasPermission("view_work_orders"),
      hasPermission("assign_tickets"),
      hasPermission("manage_work_orders"),
    ]);

  if (!canViewTickets && !canViewWorkOrders) {
    return (
      <AccessDenied message="Você não tem permissão para ver chamados ou ordens de serviço." />
    );
  }

  const isDispatcher = canAssignTickets || canManageWorkOrders;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isDispatcher
            ? "Tudo que está em aberto, do mais urgente para o menos. Designe um técnico direto na linha."
            : "Chamados e ordens de serviço atribuídos a você."}
        </p>
      </div>

      {isDispatcher ? (
        <FilaDeTrabalho
          canAssignTickets={canAssignTickets}
          canManageWorkOrders={canManageWorkOrders}
        />
      ) : (
        <MinhasAtividadesList
          canViewTickets={canViewTickets}
          canViewWorkOrders={canViewWorkOrders}
        />
      )}
    </div>
  );
}
