"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { NarrativeForm } from "@/features/maintenance/components/narrative-form";
import { RecordLifecycleButtons } from "@/features/maintenance/components/record-lifecycle-buttons";
import { RecordConclusion } from "@/features/maintenance/components/record-conclusion";
import { AttachmentUploaderGroup } from "@/features/attachments/components/attachment-uploader";
import {
  CORRECTIVE_ATTACHMENT_CATEGORIES,
  missingRequiredCategories,
} from "@/features/attachments/schema";
import { MAINTENANCE_RESOLUTION_LABELS } from "@/features/maintenance/schema";
import { PartsRequestDialog } from "@/features/parts-requests/components/parts-request-dialog";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import type { TicketPriority } from "@/features/tickets/schema";
import { PageBackHeader } from "@/components/shared/page-back-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Data e hora de um `timestamptz` — o fuso local do aparelho, que é o do técnico. */
function formatMoment(iso: string | null): string {
  if (!iso) return "data não registrada";
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Atendimento de **corretiva** (Fase 10): um problema, num aparelho.
 *
 * Sem checklist e sem medições — decisão do usuário, que descreveu a corretiva
 * como fotografar, pedir peça e laudar. Antes desta fase a mesma tela genérica
 * servia corretiva e preventiva, com as quatro seções sempre visíveis.
 *
 * As seções de trabalho só aparecem depois de "Iniciar atividade": é esse toque
 * que move a OS para "em andamento" no sistema, então deixá-lo pulável faria o
 * administrador ver "Aberta" com o serviço já em curso.
 *
 * Fase 11 — o cartão de origem passou a dizer **quem** abriu e **quando** (podia
 * ter sido o despachante ou outro técnico durante uma preventiva), a peça saiu
 * de formulário aberto para botão, e o atendimento continua editável depois de
 * concluído enquanto a OS não for fechada.
 */
export function AtendimentoCorretiva({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
  const partsRef = useRef<HTMLDivElement>(null);
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [record, workOrder, partsRequests, attachments, meta] = await Promise.all([
      offlineDb.maintenanceRecords.get(maintenanceRecordId),
      offlineDb.workOrders.get(workOrderId),
      offlineDb.partsRequests.where("maintenanceRecordId").equals(maintenanceRecordId).toArray(),
      offlineDb.attachments.where("maintenanceRecordId").equals(maintenanceRecordId).toArray(),
      offlineDb.meta.get("companyId"),
    ]);

    const equipment = record ? await offlineDb.equipment.get(record.equipmentId) : undefined;
    const environment = equipment
      ? await offlineDb.environments.get(equipment.environmentId)
      : undefined;
    const sector = environment?.sectorId
      ? await offlineDb.sectors.get(environment.sectorId)
      : undefined;
    const ticket = workOrder?.originTicketId
      ? await offlineDb.tickets.get(workOrder.originTicketId)
      : undefined;

    return {
      record,
      workOrder,
      equipment,
      environment,
      sector,
      ticket,
      partsRequests,
      attachments,
      companyId: meta?.value ?? "",
    };
  }, [workOrderId, maintenanceRecordId]);

  if (!data) {
    return <p className="text-muted-foreground text-sm">Carregando…</p>;
  }

  const { record, workOrder } = data;

  if (!record || !workOrder) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Este atendimento ainda não foi baixado neste dispositivo. Conecte-se à internet e toque no
          ícone de atualizar, ao lado do indicador de sincronização no topo da tela.
        </CardContent>
      </Card>
    );
  }

  const started = Boolean(record.startedAt);
  const done = record.status === "completed";
  const readOnly = workOrder.status === "concluida" || workOrder.status === "cancelada";
  const backHref = `/minhas-atividades/${workOrder.unitId}/corretivas`;
  const missingPhotos = missingRequiredCategories(
    CORRECTIVE_ATTACHMENT_CATEGORIES,
    data.attachments,
  );

  function focusParts() {
    setPartsDialogOpen(true);
    partsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageBackHeader
        backHref={backHref}
        backLabel="Corretivas"
        title={record.equipmentTag}
        subtitle={workOrder.unitName}
        actions={
          readOnly ? (
            <Badge variant="outline">OS fechada</Badge>
          ) : done ? (
            <Badge variant="secondary">
              {record.resolution
                ? MAINTENANCE_RESOLUTION_LABELS[record.resolution]
                : "Concluído"}
            </Badge>
          ) : (
            <RecordLifecycleButtons
              recordId={record.id}
              startedAt={record.startedAt}
              status={record.status}
            />
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chamado</CardTitle>
          <CardDescription>{workOrder.title}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {data.ticket ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{data.ticket.title}</span>
                <TicketPriorityBadge priority={data.ticket.priority as TicketPriority} />
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {data.ticket.description ?? "Sem descrição registrada."}
              </p>
              <p className="text-muted-foreground text-xs">
                Aberto por {data.ticket.openedByName ?? "usuário não identificado"} em{" "}
                {formatMoment(data.ticket.openedAt)}.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Sem chamado de origem — ordem de serviço aberta por{" "}
              {workOrder.createdByName ?? "usuário não identificado"} em{" "}
              {formatMoment(workOrder.createdAt)}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipamento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Tag" value={record.equipmentTag} />
          <Info
            label="Localização"
            value={
              [data.sector?.name, data.environment?.name].filter(Boolean).join(" · ") ||
              "Não registrada"
            }
          />
          <Info label="Tipo" value={data.equipment?.type ?? "—"} />
          <Info
            label="Marca / modelo"
            value={[data.equipment?.brand, data.equipment?.model].filter(Boolean).join(" ") || "—"}
          />
        </CardContent>
      </Card>

      {!started ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Toque em <span className="font-medium">Iniciar atividade</span> para
            começar. O administrador passa a ver esta ordem de serviço como
            &quot;em andamento&quot;.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentUploaderGroup
                companyId={data.companyId}
                workOrderId={workOrderId}
                maintenanceRecordId={record.id}
                equipmentId={record.equipmentId}
                categories={CORRECTIVE_ATTACHMENT_CATEGORIES}
                attachments={data.attachments}
                readOnly={readOnly}
              />
            </CardContent>
          </Card>

          <Card ref={partsRef}>
            <CardHeader>
              <CardTitle className="text-base">Peças</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.partsRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma peça solicitada ainda.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {data.partsRequests.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {p.partName} × {p.quantity}
                      </span>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {!readOnly && (
                <PartsRequestDialog
                  workOrderId={workOrderId}
                  maintenanceRecordId={record.id}
                  open={partsDialogOpen}
                  onOpenChange={setPartsDialogOpen}
                  disabled={missingPhotos.length > 0}
                  disabledReason="Suba a foto do equipamento e da etiqueta para solicitar peça."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Laudo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <NarrativeForm record={record} disabled={readOnly} />
              {!readOnly && (
                <div className="border-t pt-6">
                  <RecordConclusion
                    recordId={record.id}
                    missingPhotos={missingPhotos}
                    hasParts={data.partsRequests.length > 0}
                    alreadyDone={done}
                    currentResolution={record.resolution}
                    backHref={backHref}
                    onNeedPart={focusParts}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
