"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { TICKET_CLOSED_STATUSES, type TicketPriority, type TicketStatus } from "@/features/tickets/schema";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { WORK_ORDER_TYPE_LABELS, type WorkOrderType } from "@/features/work-orders/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * "Meu dia" do técnico — lido do Dexie (`useLiveQuery`), não do servidor:
 * funciona 100% offline depois do primeiro pull (ver
 * `src/lib/offline/pull-sync.ts`). O Server Component da página só decide *se*
 * cada seção aparece (checagem de permissão, que continua sendo fronteira de
 * segurança server-side); os dados em si vêm sempre local.
 *
 * Fase 9 — agrupado por **unidade**: o técnico trabalha por local, não por uma
 * lista plana de tarefas soltas. O cabeçalho de cada grupo leva à página da
 * unidade, onde ficam as preventivas, corretivas e os equipamentos dali.
 */

type UnitGroup = {
  unitId: string;
  unitName: string;
  clientName: string;
  maintenanceItems: {
    id: string;
    workOrderId: string;
    workOrderTitle: string;
    workOrderType: string;
    equipmentTag: string;
    done: boolean;
  }[];
  tickets: {
    id: string;
    title: string;
    priority: string;
    status: string;
    equipmentTag: string | null;
  }[];
};

export function MinhasAtividadesList({
  canViewTickets,
  canViewWorkOrders,
}: {
  canViewTickets: boolean;
  canViewWorkOrders: boolean;
}) {
  const groups = useLiveQuery(async () => {
    const [tickets, records, allWorkOrders] = await Promise.all([
      canViewTickets ? offlineDb.tickets.toArray() : Promise.resolve([]),
      // Todos os registros, não só os `draft`: uma OS ainda **aberta** cujos
      // equipamentos já foram todos atendidos continua sendo trabalho dela
      // (falta o fechamento). Filtrar por `draft` aqui fazia a unidade
      // desaparecer do Início enquanto o Dashboard ainda a listava — a técnica
      // não tinha como alcançar a OS pela tela inicial.
      canViewWorkOrders ? offlineDb.maintenanceRecords.toArray() : Promise.resolve([]),
      canViewWorkOrders ? offlineDb.workOrders.toArray() : Promise.resolve([]),
    ]);

    // O que define o grupo é a OS estar em aberto, não o estado dos registros.
    const workOrders = allWorkOrders.filter(
      (w) => w.status !== "concluida" && w.status !== "cancelada",
    );

    const byUnit = new Map<string, UnitGroup>();
    const ensure = (unitId: string, unitName: string, clientName: string) => {
      const existing = byUnit.get(unitId);
      if (existing) return existing;
      const created: UnitGroup = {
        unitId,
        unitName,
        clientName,
        maintenanceItems: [],
        tickets: [],
      };
      byUnit.set(unitId, created);
      return created;
    };

    const workOrderById = new Map(workOrders.map((w) => [w.id, w]));
    for (const r of records) {
      const wo = workOrderById.get(r.workOrderId);
      if (!wo) continue;
      ensure(wo.unitId, wo.unitName, wo.clientName).maintenanceItems.push({
        id: r.id,
        workOrderId: r.workOrderId,
        workOrderTitle: wo.title,
        workOrderType: wo.type,
        equipmentTag: r.equipmentTag,
        done: r.status === "completed",
      });
    }

    // Pendente primeiro — o que falta atender é o que ele abre o app para ver.
    for (const group of byUnit.values()) {
      group.maintenanceItems.sort((a, b) => Number(a.done) - Number(b.done));
    }

    for (const t of tickets) {
      if (TICKET_CLOSED_STATUSES.includes(t.status as TicketStatus)) continue;
      ensure(t.unitId, t.unitName, t.clientName).tickets.push({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        equipmentTag: t.equipmentTag,
      });
    }

    return Array.from(byUnit.values()).sort((a, b) =>
      a.unitName.localeCompare(b.unitName),
    );
  }, [canViewTickets, canViewWorkOrders]);

  // useLiveQuery retorna undefined até a primeira leitura do IndexedDB resolver.
  if (!groups) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nada atribuído a você no momento. Quando o administrador designar uma
          ordem de serviço ou um chamado, ele aparece aqui.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group.unitId}>
          <CardHeader className="pb-3">
            <Link
              href={`/minhas-atividades/${group.unitId}`}
              className="group flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <CardTitle className="truncate text-base group-hover:underline">
                  {group.unitName}
                </CardTitle>
                <p className="text-muted-foreground truncate text-sm">
                  {group.clientName}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {group.maintenanceItems.map((mr) => (
              <Link
                key={mr.id}
                href={`/ordens-servico/${mr.workOrderId}/atender/${mr.id}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border p-3 text-sm transition-colors"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{mr.equipmentTag}</span>
                  <span className="text-muted-foreground"> · {mr.workOrderTitle}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {WORK_ORDER_TYPE_LABELS[mr.workOrderType as WorkOrderType]}
                  </Badge>
                  {mr.done && <Badge variant="secondary">Concluído</Badge>}
                </span>
              </Link>
            ))}

            {group.tickets.map((t) => (
              <Link
                key={t.id}
                href={`/chamados/${t.id}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border p-3 text-sm transition-colors"
              >
                <span className="min-w-0 truncate">
                  {t.title}
                  {t.equipmentTag ? (
                    <span className="text-muted-foreground"> · {t.equipmentTag}</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <TicketPriorityBadge priority={t.priority as TicketPriority} />
                  <TicketStatusBadge status={t.status as TicketStatus} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
