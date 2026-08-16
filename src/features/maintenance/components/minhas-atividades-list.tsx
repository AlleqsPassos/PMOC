"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { TICKET_CLOSED_STATUSES, type TicketPriority, type TicketStatus } from "@/features/tickets/schema";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { WORK_ORDER_TYPE_LABELS, type WorkOrderType } from "@/features/work-orders/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Fase 6 — "Meu dia" do técnico lido do Dexie (`useLiveQuery`), não do
 * servidor: funciona 100% offline depois do primeiro pull (ver
 * `src/lib/offline/pull-sync.ts`). O Server Component da página só decide
 * *se* cada seção aparece (checagem de permissão, que continua sendo
 * fronteira de segurança server-side); os dados em si vêm sempre local.
 */
export function MinhasAtividadesList({
  canViewTickets,
  canViewWorkOrders,
}: {
  canViewTickets: boolean;
  canViewWorkOrders: boolean;
}) {
  const data = useLiveQuery(async () => {
    const [tickets, records, workOrders] = await Promise.all([
      canViewTickets ? offlineDb.tickets.toArray() : Promise.resolve([]),
      canViewWorkOrders
        ? offlineDb.maintenanceRecords.where("status").equals("draft").toArray()
        : Promise.resolve([]),
      canViewWorkOrders ? offlineDb.workOrders.toArray() : Promise.resolve([]),
    ]);

    const openTickets = tickets.filter(
      (t) => !TICKET_CLOSED_STATUSES.includes(t.status as TicketStatus),
    );

    const workOrderById = new Map(workOrders.map((w) => [w.id, w]));
    const maintenanceItems = records.flatMap((r) => {
      const wo = workOrderById.get(r.workOrderId);
      if (!wo) return [];
      return [
        {
          id: r.id,
          workOrderId: r.workOrderId,
          workOrderTitle: wo.title,
          workOrderType: wo.type,
          equipmentTag: r.equipmentTag,
          clientName: wo.clientName,
          unitName: wo.unitName,
        },
      ];
    });

    return { tickets: openTickets, maintenanceItems };
  }, [canViewTickets, canViewWorkOrders]);

  // useLiveQuery retorna undefined até a primeira leitura do IndexedDB resolver.
  if (!data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  const isEmpty = data.tickets.length === 0 && data.maintenanceItems.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nada atribuído a você no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.maintenanceItems.map((mr) => (
        <Link key={mr.id} href={`/ordens-servico/${mr.workOrderId}/atender/${mr.id}`}>
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                {mr.workOrderTitle} — {mr.equipmentTag}
              </CardTitle>
              <Badge variant="outline">{WORK_ORDER_TYPE_LABELS[mr.workOrderType as WorkOrderType]}</Badge>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {mr.clientName} — {mr.unitName}
            </CardContent>
          </Card>
        </Link>
      ))}

      {data.tickets.map((t) => (
        <Link key={t.id} href={`/chamados/${t.id}`}>
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{t.title}</CardTitle>
              <div className="flex items-center gap-2">
                <TicketPriorityBadge priority={t.priority as TicketPriority} />
                <TicketStatusBadge status={t.status as TicketStatus} />
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
  );
}
