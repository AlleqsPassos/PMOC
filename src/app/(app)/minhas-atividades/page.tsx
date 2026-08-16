import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { MinhasAtividadesList } from "@/features/maintenance/components/minhas-atividades-list";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata: Metadata = { title: "Minhas atividades — PMOC+" };

// "Meu dia" do técnico — offline-first desde a Fase 6. A checagem de
// permissão continua no servidor (fronteira de segurança); os dados em si
// (chamados + OS em aberto) vêm do Dexie local via MinhasAtividadesList,
// funcionando sem rede depois do primeiro pull (ver src/lib/offline/).
export default async function MinhasAtividadesPage() {
  await requireUser();

  const [canViewTickets, canViewWorkOrders] = await Promise.all([
    hasPermission("view_tickets"),
    hasPermission("view_work_orders"),
  ]);
  if (!canViewTickets && !canViewWorkOrders) {
    return <AccessDenied message="Você não tem permissão para ver chamados ou ordens de serviço." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas atividades</h1>
        <p className="text-muted-foreground text-sm">
          Chamados e ordens de serviço atribuídos a você.
        </p>
      </div>

      <MinhasAtividadesList canViewTickets={canViewTickets} canViewWorkOrders={canViewWorkOrders} />
    </div>
  );
}
