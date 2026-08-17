import Link from "next/link";
import { AlertTriangle, CalendarClock, ClipboardList, Headset } from "lucide-react";
import { listDispatchQueue, type DispatchItem } from "@/features/dispatch/queries";
import { listCompanyUsers } from "@/features/users/queries";
import { TicketAssignSelect } from "@/features/tickets/components/ticket-assign-select";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { WorkOrderAssignSelect } from "@/features/work-orders/components/work-order-assign-select";
import { WorkOrderStatusBadge } from "@/features/work-orders/components/work-order-status-badge";
import { GenerateWorkOrderDialog } from "@/features/work-orders/components/generate-work-order-dialog";
import { WORK_ORDER_TYPE_LABELS } from "@/features/work-orders/schema";
import { formatDateOnly } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const KIND_ICON = {
  ticket: Headset,
  work_order: ClipboardList,
  preventive_plan: CalendarClock,
} as const;

const KIND_HREF = {
  ticket: (id: string) => `/chamados/${id}`,
  work_order: (id: string) => `/ordens-servico/${id}`,
  preventive_plan: () => "/preventivas",
} as const;

/**
 * Fila do despachante: chamados, OS e preventivas numa lista só, ordenada por
 * urgência, com a ação de designar embutida na própria linha — sem abrir tela
 * nenhuma. Reaproveita os seletores de atribuição que já existiam nas páginas
 * de detalhe (`TicketAssignSelect`/`WorkOrderAssignSelect`), então a regra de
 * negócio (designar avança `aberto` → `designado`) continua num lugar só.
 */
export async function FilaDeTrabalho({
  canAssignTickets,
  canManageWorkOrders,
}: {
  canAssignTickets: boolean;
  canManageWorkOrders: boolean;
}) {
  const [items, users] = await Promise.all([
    listDispatchQueue(),
    listCompanyUsers(),
  ]);

  const assignableUsers = users
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, fullName: u.fullName }));

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nada em aberto no momento. Chamados, ordens de serviço e preventivas
          aparecem aqui assim que forem criados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Row
          key={`${item.kind}-${item.id}`}
          item={item}
          users={assignableUsers}
          canAssignTickets={canAssignTickets}
          canManageWorkOrders={canManageWorkOrders}
        />
      ))}
    </div>
  );
}

function Row({
  item,
  users,
  canAssignTickets,
  canManageWorkOrders,
}: {
  item: DispatchItem;
  users: { id: string; fullName: string }[];
  canAssignTickets: boolean;
  canManageWorkOrders: boolean;
}) {
  const Icon = KIND_ICON[item.kind];
  const href =
    item.kind === "preventive_plan"
      ? KIND_HREF.preventive_plan()
      : KIND_HREF[item.kind](item.id);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={href} className="font-medium hover:underline">
                {item.title}
              </Link>
              {item.ticketPriority && (
                <TicketPriorityBadge priority={item.ticketPriority} />
              )}
              {item.ticketStatus && <TicketStatusBadge status={item.ticketStatus} />}
              {item.workOrderType && (
                <Badge variant="outline">
                  {WORK_ORDER_TYPE_LABELS[item.workOrderType]}
                </Badge>
              )}
              {item.workOrderStatus && (
                <WorkOrderStatusBadge status={item.workOrderStatus} />
              )}
              {item.kind === "preventive_plan" && (
                <Badge variant="outline">Preventiva sem OS</Badge>
              )}
              {item.isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Atrasada
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground truncate text-sm">
              {item.clientName} — {item.unitName}
              {item.equipmentCount !== undefined &&
                ` · ${item.equipmentCount} equipamento${item.equipmentCount === 1 ? "" : "s"}`}
              {" · "}
              {formatDateOnly(item.date)}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {item.kind === "ticket" && canAssignTickets && (
            <TicketAssignSelect
              ticketId={item.id}
              assignedUserId={item.assignedUserId}
              users={users}
            />
          )}
          {item.kind === "work_order" && canManageWorkOrders && (
            <WorkOrderAssignSelect
              workOrderId={item.id}
              assignedUserId={item.assignedUserId}
              users={users}
            />
          )}
          {item.kind === "preventive_plan" && canManageWorkOrders && (
            <GenerateWorkOrderDialog
              mode="from-preventive-plan"
              planId={item.id}
              defaultTitle={item.title}
              users={users}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
