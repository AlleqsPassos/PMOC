import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listMyTickets } from "@/features/tickets/queries";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { listMyMaintenanceRecords } from "@/features/maintenance/queries";
import { WORK_ORDER_TYPE_LABELS } from "@/features/work-orders/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Minhas atividades — PMOC+" };

// "Meu dia" do técnico: chamados atribuídos (view_tickets) + ordens de
// serviço em aberto atribuídas a ele (view_work_orders) — os dois módulos
// de campo que existem até a Fase 4.
export default async function MinhasAtividadesPage() {
  const user = await requireUser();

  const [canViewTickets, canViewWorkOrders] = await Promise.all([
    hasPermission("view_tickets"),
    hasPermission("view_work_orders"),
  ]);
  if (!canViewTickets && !canViewWorkOrders) {
    return <AccessDenied message="Você não tem permissão para ver chamados ou ordens de serviço." />;
  }

  const [tickets, maintenanceRecords] = await Promise.all([
    canViewTickets ? listMyTickets(user.id) : Promise.resolve([]),
    canViewWorkOrders ? listMyMaintenanceRecords(user.id) : Promise.resolve([]),
  ]);

  const isEmpty = tickets.length === 0 && maintenanceRecords.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas atividades</h1>
        <p className="text-muted-foreground text-sm">
          Chamados e ordens de serviço atribuídos a você.
        </p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Nada atribuído a você no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {maintenanceRecords.map((mr) => (
            <Link key={mr.id} href={`/ordens-servico/${mr.workOrderId}/atender/${mr.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">
                    {mr.workOrderTitle} — {mr.equipmentTag}
                  </CardTitle>
                  <Badge variant="outline">{WORK_ORDER_TYPE_LABELS[mr.workOrderType]}</Badge>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {mr.clientName} — {mr.unitName}
                </CardContent>
              </Card>
            </Link>
          ))}

          {tickets.map((t) => (
            <Link key={t.id} href={`/chamados/${t.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <TicketPriorityBadge priority={t.priority} />
                    <TicketStatusBadge status={t.status} />
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>
                    {t.clientName} — {t.unitName}
                    {t.equipmentTag ? ` — ${t.equipmentTag}` : ""}
                  </span>
                  <span>{format(new Date(t.openedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
