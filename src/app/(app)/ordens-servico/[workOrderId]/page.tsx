import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/format-date";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getWorkOrderDetail } from "@/features/work-orders/queries";
import { listCompanyUsers } from "@/features/users/queries";
import { listPartsRequestsByWorkOrder } from "@/features/parts-requests/queries";
import { WorkOrderStatusSelect } from "@/features/work-orders/components/work-order-status-select";
import { WorkOrderStatusBadge } from "@/features/work-orders/components/work-order-status-badge";
import { WorkOrderAssignSelect } from "@/features/work-orders/components/work-order-assign-select";
import { WORK_ORDER_TYPE_LABELS } from "@/features/work-orders/schema";
import { PartsRequestStatusSelect } from "@/features/parts-requests/components/parts-request-status-select";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ordem de serviço — PMOC+" };

export default async function OrdemServicoDetalhePage(
  props: PageProps<"/ordens-servico/[workOrderId]">,
) {
  const { workOrderId } = await props.params;
  await requireUser();

  const canView = await hasPermission("view_work_orders");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver ordens de serviço." />;
  }

  const workOrder = await getWorkOrderDetail(workOrderId);
  if (!workOrder) notFound();

  const [canManage, canExecute, canManageParts, companyUsers, partsRequests] = await Promise.all([
    hasPermission("manage_work_orders"),
    hasPermission("execute_work_order"),
    hasPermission("manage_parts_requests"),
    listCompanyUsers(),
    listPartsRequestsByWorkOrder(workOrderId),
  ]);

  const canChangeStatus = canManage || canExecute;
  const canOpenAtendimento = canManage || canExecute;
  const assignableUsers = companyUsers
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, fullName: u.fullName }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/ordens-servico" className="hover:underline">
            Ordens de serviço
          </Link>{" "}
          / {workOrder.title}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{workOrder.title}</h1>
            <Badge variant="outline">{WORK_ORDER_TYPE_LABELS[workOrder.type]}</Badge>
          </div>
          {canChangeStatus ? (
            <WorkOrderStatusSelect
              key={workOrder.status}
              workOrderId={workOrder.id}
              status={workOrder.status}
            />
          ) : (
            <WorkOrderStatusBadge status={workOrder.status} />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Localização e origem</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Cliente" value={workOrder.clientName} />
            <Field label="Unidade" value={workOrder.unitName} href={`/unidades/${workOrder.unitId}`} />
            {workOrder.originTicketId && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Chamado de origem</p>
                <Link href={`/chamados/${workOrder.originTicketId}`} className="hover:underline">
                  Ver chamado
                </Link>
              </div>
            )}
            {workOrder.originPreventivePlanId && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Plano preventivo de origem</p>
                <Link href="/preventivas" className="hover:underline">
                  Ver preventivas
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atribuição e datas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">Técnico</p>
              {canManage ? (
                <WorkOrderAssignSelect
                  workOrderId={workOrder.id}
                  assignedUserId={workOrder.assignedUserId}
                  users={assignableUsers}
                />
              ) : (
                <p>{workOrder.assignedName ?? "Não atribuído"}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field
                label="Programada"
                value={workOrder.scheduledDate ? formatDateOnly(workOrder.scheduledDate) : null}
              />
              <Field
                label="Iniciada"
                value={
                  workOrder.startedAt
                    ? format(new Date(workOrder.startedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : null
                }
              />
              <Field
                label="Concluída"
                value={
                  workOrder.finishedAt
                    ? format(new Date(workOrder.finishedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : null
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipamentos cobertos</CardTitle>
        </CardHeader>
        <CardContent>
          {workOrder.maintenanceRecords.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum equipamento vinculado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {workOrder.maintenanceRecords.map((mr) => (
                <div
                  key={mr.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <Link href={`/equipamentos/${mr.equipmentId}`} className="hover:underline">
                    {mr.equipmentTag}
                  </Link>
                  <span className="flex items-center gap-2">
                    {mr.technicianName && (
                      <span className="text-muted-foreground text-xs">{mr.technicianName}</span>
                    )}
                    <Badge variant={mr.status === "completed" ? "default" : "outline"}>
                      {mr.status === "completed" ? "Concluído" : "Rascunho"}
                    </Badge>
                    {canOpenAtendimento && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ordens-servico/${workOrder.id}/atender/${mr.id}`}>
                          Atender
                        </Link>
                      </Button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peças solicitadas</CardTitle>
        </CardHeader>
        <CardContent>
          {partsRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma peça solicitada ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {partsRequests.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span>
                    {p.partName} × {p.quantity}
                    <span className="text-muted-foreground"> — {p.requestedByName}</span>
                  </span>
                  {canManageParts ? (
                    <PartsRequestStatusSelect
                      requestId={p.id}
                      workOrderId={workOrder.id}
                      status={p.status}
                    />
                  ) : (
                    <Badge variant="outline">{p.status}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      {value && href ? (
        <Link href={href} className="hover:underline">
          {value}
        </Link>
      ) : (
        <p>{value ?? "—"}</p>
      )}
    </div>
  );
}
