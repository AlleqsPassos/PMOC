"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AlertTriangle, CalendarClock, CloudUpload, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { discardFailedEquipmentOffline } from "@/features/equipment/offline-actions";
import { EquipmentFieldFormDialog } from "@/features/equipment/components/equipment-field-form-dialog";
import { Button } from "@/components/ui/button";
import { TICKET_CLOSED_STATUSES, type TicketStatus, type TicketPriority } from "@/features/tickets/schema";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from "@/features/work-orders/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * A unidade, do ponto de vista do técnico (Fase 9). Tudo local-first: lê do
 * Dexie via `useLiveQuery`, funciona sem rede depois do primeiro pull.
 *
 * Não reusa `/unidades/[unitId]` de propósito — aquela página é do
 * despachante: exige `view_units` (que o técnico não tem), é server-rendered
 * e traz editar/inativar unidade e CRUD de setores, que não fazem sentido em
 * campo.
 *
 * **Guarda de escopo**: só abre se houver OS ou chamado atribuído ao técnico
 * nesta unidade. A mensagem é "nada atribuído aqui", não 404 — a unidade
 * existe, ele só não tem trabalho nela. A fronteira real continua sendo a
 * RLS: o pull já traz apenas o que é dele.
 */
export function UnidadeTecnicoView({ unitId }: { unitId: string }) {
  const data = useLiveQuery(async () => {
    const [workOrders, tickets, equipment, environments, records, pending] =
      await Promise.all([
        offlineDb.workOrders.where("unitId").equals(unitId).toArray(),
        offlineDb.tickets.toArray(),
        offlineDb.equipment.where("unitId").equals(unitId).toArray(),
        offlineDb.environments.where("unitId").equals(unitId).toArray(),
        offlineDb.maintenanceRecords.toArray(),
        offlineDb.outbox.toArray(),
      ]);

    const unitTickets = tickets.filter(
      (t) =>
        t.unitId === unitId &&
        !TICKET_CLOSED_STATUSES.includes(t.status as TicketStatus),
    );

    const openWorkOrders = workOrders.filter(
      (w) => w.status !== "concluida" && w.status !== "cancelada",
    );

    const recordsByWorkOrder = new Map<string, typeof records>();
    for (const r of records) {
      const list = recordsByWorkOrder.get(r.workOrderId) ?? [];
      list.push(r);
      recordsByWorkOrder.set(r.workOrderId, list);
    }

    // Estado de sincronização por registro: o que ainda não subiu e o que o
    // servidor recusou (tag duplicada é o caso real).
    const syncState = new Map<string, { failed: boolean; error: string | null }>();
    for (const item of pending) {
      syncState.set(item.entityId, {
        failed: item.status === "error",
        error: item.lastError,
      });
    }

    return {
      hasAccess: workOrders.length > 0 || unitTickets.length > 0,
      unitName: workOrders[0]?.unitName ?? unitTickets[0]?.unitName ?? "Unidade",
      clientName: workOrders[0]?.clientName ?? unitTickets[0]?.clientName ?? "",
      preventivas: openWorkOrders.filter((w) => w.type === "preventiva"),
      corretivas: openWorkOrders.filter((w) => w.type === "corretiva"),
      tickets: unitTickets,
      equipment,
      environments,
      recordsByWorkOrder,
      syncState,
    };
  }, [unitId]);

  if (!data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (!data.hasAccess) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nada atribuído a você nesta unidade. Assim que o administrador
          designar uma ordem de serviço ou um chamado aqui, ela aparece no seu
          Início.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/minhas-atividades" className="hover:underline">
            Início
          </Link>{" "}
          / {data.clientName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{data.unitName}</h1>
      </div>

      <WorkOrderSection
        title="Preventivas"
        description="Manutenção programada nesta unidade."
        icon={CalendarClock}
        workOrders={data.preventivas}
        recordsByWorkOrder={data.recordsByWorkOrder}
      />

      <WorkOrderSection
        title="Corretivas"
        description="Atendimentos abertos a partir de um problema."
        icon={Wrench}
        workOrders={data.corretivas}
        recordsByWorkOrder={data.recordsByWorkOrder}
      />

      {data.tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chamados em aberto</CardTitle>
            <CardDescription>
              Ainda sem ordem de serviço gerada.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.tickets.map((t) => (
              <Link
                key={t.id}
                href={`/chamados/${t.id}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border p-3 text-sm transition-colors"
              >
                <span className="min-w-0 truncate">{t.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <TicketPriorityBadge priority={t.priority as TicketPriority} />
                  <TicketStatusBadge status={t.status as TicketStatus} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Equipamentos</CardTitle>
            <CardDescription>
              Os aparelhos desta unidade. Achou um que não está aqui? Cadastre.
            </CardDescription>
          </div>
          <EquipmentFieldFormDialog
            unitId={unitId}
            environments={data.environments.map((e) => ({ id: e.id, name: e.name }))}
          />
        </CardHeader>
        <CardContent>
          {data.equipment.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum equipamento cadastrado nesta unidade ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.equipment.map((eq) => {
                const environment = data.environments.find(
                  (e) => e.id === eq.environmentId,
                );
                const sync = data.syncState.get(eq.id);
                return (
                  <li
                    key={eq.id}
                    className="flex flex-col gap-2 rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="font-medium">{eq.tag}</span>
                        <span className="text-muted-foreground">
                          {environment ? ` · ${environment.name}` : ""}
                          {[eq.brand, eq.model].filter(Boolean).length
                            ? ` · ${[eq.brand, eq.model].filter(Boolean).join(" ")}`
                            : ""}
                        </span>
                      </span>
                      {sync && !sync.failed && (
                        <Badge variant="outline" className="shrink-0 gap-1">
                          <CloudUpload className="size-3" />
                          Aguardando sincronização
                        </Badge>
                      )}
                      {sync?.failed && (
                        <Badge variant="destructive" className="shrink-0 gap-1">
                          <AlertTriangle className="size-3" />
                          Não sincronizou
                        </Badge>
                      )}
                    </div>
                    {sync?.failed && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-destructive text-xs">{sync.error}</p>
                        <DiscardFailedEquipmentButton
                          equipmentId={eq.id}
                          tag={eq.tag}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Única saída do técnico para um cadastro que o servidor recusou — ele não
 * tem permissão de editar equipamento, então descartar e refazer é o caminho. */
function DiscardFailedEquipmentButton({
  equipmentId,
  tag,
}: {
  equipmentId: string;
  tag: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await discardFailedEquipmentOffline(equipmentId);
          toast.success(`Cadastro de ${tag} descartado. Refaça com outra tag.`);
        })
      }
    >
      <Trash2 className="size-4" />
      Descartar
    </Button>
  );
}

function WorkOrderSection({
  title,
  description,
  icon: Icon,
  workOrders,
  recordsByWorkOrder,
}: {
  title: string;
  description: string;
  icon: typeof Wrench;
  workOrders: { id: string; title: string; status: string }[];
  recordsByWorkOrder: Map<
    string,
    { id: string; equipmentTag: string; status: "draft" | "completed" }[]
  >;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="text-muted-foreground size-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {workOrders.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nada em aberto nesta unidade.
          </p>
        ) : (
          workOrders.map((wo) => {
            const records = recordsByWorkOrder.get(wo.id) ?? [];
            const done = records.filter((r) => r.status === "completed").length;
            return (
              <div key={wo.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{wo.title}</span>
                  <Badge variant="outline">
                    {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus]}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {done} de {records.length} equipamentos concluídos
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {records.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/ordens-servico/${wo.id}/atender/${r.id}`}
                        className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border p-2 text-sm transition-colors"
                      >
                        <span>{r.equipmentTag}</span>
                        <Badge
                          variant={r.status === "completed" ? "secondary" : "default"}
                        >
                          {r.status === "completed" ? "Concluído" : "Atender"}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
