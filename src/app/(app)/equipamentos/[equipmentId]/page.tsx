import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getEquipmentById } from "@/features/equipment/queries";
import {
  listUnitOptions,
  listSectorOptions,
  listEnvironmentOptions,
} from "@/features/units/queries";
import { listClientOptions } from "@/features/clients/queries";
import { EquipmentFormDialog } from "@/features/equipment/components/equipment-form-dialog";
import { EquipmentStatusSelect } from "@/features/equipment/components/equipment-status-select";
import { EquipmentStatusBadge } from "@/features/equipment/components/equipment-status-badge";
import { listTicketsByEquipment } from "@/features/tickets/queries";
import { TicketQuickFormDialog } from "@/features/tickets/components/ticket-quick-form-dialog";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { listMaintenanceRecordsByEquipment } from "@/features/maintenance/queries";
import { WORK_ORDER_TYPE_LABELS } from "@/features/work-orders/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Equipamento — PMOC+" };

export default async function EquipamentoDetalhePage(
  props: PageProps<"/equipamentos/[equipmentId]">,
) {
  const { equipmentId } = await props.params;
  await requireUser();

  const canView = await hasPermission("view_equipment");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver equipamentos." />;
  }

  const equipment = await getEquipmentById(equipmentId);
  if (!equipment) notFound();

  const [
    clientOptions,
    unitOptions,
    sectorOptions,
    environmentOptions,
    canEdit,
    tickets,
    canCreateTicket,
    maintenanceHistory,
  ] = await Promise.all([
    listClientOptions(),
    listUnitOptions(),
    listSectorOptions(),
    listEnvironmentOptions(),
    hasPermission("edit_equipment"),
    listTicketsByEquipment(equipmentId),
    hasPermission("create_tickets"),
    listMaintenanceRecordsByEquipment(equipmentId),
  ]);

  const unitOptionsForForm = unitOptions.map((u) => ({
    id: u.id,
    name: u.name,
    clientName: clientOptions.find((c) => c.id === u.clientId)?.corporateName ?? "—",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/equipamentos" className="hover:underline">
            Equipamentos
          </Link>{" "}
          /{" "}
          <Link href={`/unidades/${equipment.unitId}`} className="hover:underline">
            {equipment.unitName}
          </Link>{" "}
          / {equipment.tag}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{equipment.tag}</h1>
          {canEdit && (
            <div className="flex items-center gap-2">
              <EquipmentStatusSelect equipmentId={equipment.id} status={equipment.status} />
              <EquipmentFormDialog
                mode="edit"
                equipment={equipment}
                unitOptions={unitOptionsForForm}
                sectorOptions={sectorOptions}
                environmentOptions={environmentOptions}
              />
            </div>
          )}
          {!canEdit && <EquipmentStatusBadge status={equipment.status} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Localização</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Cliente" value={equipment.clientName} />
          <Field label="Unidade" value={equipment.unitName} />
          <Field label="Ambiente" value={equipment.environmentName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Especificações técnicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Tipo" value={equipment.type} />
          <Field label="Marca" value={equipment.brand} />
          <Field label="Modelo" value={equipment.model} />
          <Field label="Número de série" value={equipment.serialNumber} />
          <Field
            label="Capacidade"
            value={equipment.capacityBtu ? `${equipment.capacityBtu} BTU` : null}
          />
          <Field label="Gás refrigerante" value={equipment.refrigerant} />
          <Field label="Tensão" value={equipment.voltage} />
          {equipment.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-muted-foreground text-xs">Observações</p>
              <p>{equipment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Chamados</CardTitle>
            <CardDescription>Ocorrências reportadas para este equipamento.</CardDescription>
          </div>
          {canCreateTicket && (
            <TicketQuickFormDialog
              equipmentId={equipment.id}
              locationLabel={`${equipment.tag} (${equipment.unitName})`}
            />
          )}
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum chamado aberto ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/chamados/${t.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-accent/50"
                >
                  <span>{t.title}</span>
                  <span className="flex items-center gap-2">
                    <TicketPriorityBadge priority={t.priority} />
                    <TicketStatusBadge status={t.status} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de manutenção</CardTitle>
          <CardDescription>Laudos de ordens de serviço concluídas para este equipamento.</CardDescription>
        </CardHeader>
        <CardContent>
          {maintenanceHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {maintenanceHistory.map((h) => (
                <Link
                  key={h.id}
                  href={`/ordens-servico/${h.workOrderId}/atender/${h.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-accent/50"
                >
                  <span className="flex flex-col">
                    <span>{h.workOrderTitle}</span>
                    {h.diagnosis && (
                      <span className="text-muted-foreground text-xs">{h.diagnosis}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{WORK_ORDER_TYPE_LABELS[h.workOrderType]}</Badge>
                    <span className="text-muted-foreground">
                      {h.technicianName ?? "—"} ·{" "}
                      {h.completedAt
                        ? format(new Date(h.completedAt), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value ?? "—"}</p>
    </div>
  );
}
