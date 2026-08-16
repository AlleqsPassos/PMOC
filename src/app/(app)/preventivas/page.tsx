import type { Metadata } from "next";
import { formatDateOnly } from "@/lib/format-date";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getPreventivePlanDetail,
  listPreventivePlans,
} from "@/features/preventive-plans/queries";
import { listClientOptions } from "@/features/clients/queries";
import { listUnitOptions } from "@/features/units/queries";
import { listEquipmentOptions } from "@/features/equipment/queries";
import { listCompanyUsers } from "@/features/users/queries";
import { PreventivePlanFormDialog } from "@/features/preventive-plans/components/preventive-plan-form-dialog";
import { PreventivePlanStatusToggle } from "@/features/preventive-plans/components/preventive-plan-status-toggle";
import { GenerateWorkOrderDialog } from "@/features/work-orders/components/generate-work-order-dialog";
import { PERIODICITY_LABELS } from "@/features/preventive-plans/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Preventivas — PMOC+" };

export default async function PreventivasPage() {
  await requireUser();

  const canManage = await hasPermission("manage_preventive_plans");
  if (!canManage) {
    return <AccessDenied message="Você não tem permissão para ver preventivas." />;
  }

  const [plans, clientOptions, unitOptions, equipmentOptions, companyUsers] = await Promise.all([
    listPreventivePlans(),
    listClientOptions(),
    listUnitOptions(),
    listEquipmentOptions(),
    listCompanyUsers(),
  ]);

  const planDetails = await Promise.all(plans.map((p) => getPreventivePlanDetail(p.id)));
  const assignableUsers = companyUsers
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, fullName: u.fullName }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Preventivas</h1>
          <p className="text-muted-foreground text-sm">
            Agendas recorrentes de manutenção, agrupando equipamentos por unidade.
          </p>
        </div>
        {clientOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Cadastre um cliente primeiro.</p>
        ) : (
          <PreventivePlanFormDialog
            mode="create"
            clientOptions={clientOptions}
            unitOptions={unitOptions}
            equipmentOptions={equipmentOptions}
            users={assignableUsers}
          />
        )}
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente / Unidade</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Equipamentos</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground text-center">
                    Nenhum plano preventivo cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan, i) => {
                  const detail = planDetails[i];
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.clientName} — {plan.unitName}
                      </TableCell>
                      <TableCell>{PERIODICITY_LABELS[plan.periodicity]}</TableCell>
                      <TableCell>
                        {formatDateOnly(plan.periodStart)} – {formatDateOnly(plan.periodEnd)}
                      </TableCell>
                      <TableCell>{plan.equipmentCount}</TableCell>
                      <TableCell>{plan.assignedName ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={plan.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {plan.status === "active" && (
                            <GenerateWorkOrderDialog
                              mode="from-preventive-plan"
                              planId={plan.id}
                              defaultTitle={`OS preventiva — ${plan.clientName} / ${plan.unitName}`}
                              users={assignableUsers}
                            />
                          )}
                          {detail && (
                            <PreventivePlanFormDialog
                              mode="edit"
                              plan={detail}
                              clientOptions={clientOptions}
                              unitOptions={unitOptions}
                              equipmentOptions={equipmentOptions}
                              users={assignableUsers}
                            />
                          )}
                          <PreventivePlanStatusToggle planId={plan.id} status={plan.status} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
