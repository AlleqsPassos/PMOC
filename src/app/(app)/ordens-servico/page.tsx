import type { Metadata } from "next";
import Link from "next/link";
import { formatDateOnly } from "@/lib/format-date";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listWorkOrders } from "@/features/work-orders/queries";
import { listClientOptions } from "@/features/clients/queries";
import { listUnitOptions } from "@/features/units/queries";
import { WorkOrderFilters } from "@/features/work-orders/components/work-order-filters";
import { WorkOrderStatusBadge } from "@/features/work-orders/components/work-order-status-badge";
import {
  WORK_ORDER_STATUS,
  WORK_ORDER_TYPE,
  WORK_ORDER_TYPE_LABELS,
  type WorkOrderStatus,
  type WorkOrderType,
} from "@/features/work-orders/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Ordens de serviço — PMOC+" };

function isStatus(value: string | undefined): value is WorkOrderStatus {
  return !!value && (WORK_ORDER_STATUS as readonly string[]).includes(value);
}

function isType(value: string | undefined): value is WorkOrderType {
  return !!value && (WORK_ORDER_TYPE as readonly string[]).includes(value);
}

export default async function OrdensServicoPage(props: PageProps<"/ordens-servico">) {
  const searchParams = await props.searchParams;
  await requireUser();

  const canView = await hasPermission("view_work_orders");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver ordens de serviço." />;
  }

  const clientId = typeof searchParams.clientId === "string" ? searchParams.clientId : undefined;
  const unitId = typeof searchParams.unitId === "string" ? searchParams.unitId : undefined;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const typeParam = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const type = isType(typeParam) ? typeParam : undefined;

  const [workOrders, clientOptions, unitOptions] = await Promise.all([
    listWorkOrders({ clientId, unitId, status, type }),
    listClientOptions(),
    listUnitOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
        <p className="text-muted-foreground text-sm">
          Geradas a partir de chamados (corretivas) ou de planos preventivos.
        </p>
      </div>

      <WorkOrderFilters clientOptions={clientOptions} unitOptions={unitOptions} />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente / Unidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Programada para</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Nenhuma ordem de serviço encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-medium">
                      <Link href={`/ordens-servico/${wo.id}`} className="hover:underline">
                        {wo.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {wo.clientName} — {wo.unitName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{WORK_ORDER_TYPE_LABELS[wo.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <WorkOrderStatusBadge status={wo.status} />
                    </TableCell>
                    <TableCell>{wo.assignedName ?? "—"}</TableCell>
                    <TableCell>
                      {wo.scheduledDate ? formatDateOnly(wo.scheduledDate) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
