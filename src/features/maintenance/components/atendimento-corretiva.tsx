"use client";

import Link from "next/link";
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
import { PartsRequestForm } from "@/features/parts-requests/components/parts-request-form";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import type { TicketPriority } from "@/features/tickets/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
 */
export function AtendimentoCorretiva({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
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
  const backHref = `/minhas-atividades/${workOrder.unitId}/corretivas`;
  const missingPhotos = missingRequiredCategories(
    CORRECTIVE_ATTACHMENT_CATEGORIES,
    data.attachments,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href={`/minhas-atividades/${workOrder.unitId}`} className="hover:underline">
            {workOrder.unitName}
          </Link>{" "}
          /{" "}
          <Link href={backHref} className="hover:underline">
            Corretivas
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{record.equipmentTag}</h1>
            {done && (
              <Badge variant="secondary">
                {record.resolution
                  ? MAINTENANCE_RESOLUTION_LABELS[record.resolution]
                  : "Concluído"}
              </Badge>
            )}
          </div>
          <RecordLifecycleButtons
            recordId={record.id}
            startedAt={record.startedAt}
            status={record.status}
          />
        </div>
      </div>

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
            </>
          ) : (
            <p className="text-muted-foreground">
              Esta OS não veio de um chamado — foi aberta direto pelo administrador.
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
              <CardDescription>
                Equipamento e etiqueta são obrigatórias. Vídeo não vai por aqui —
                mande direto ao administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttachmentUploaderGroup
                companyId={data.companyId}
                workOrderId={workOrderId}
                maintenanceRecordId={record.id}
                equipmentId={record.equipmentId}
                categories={CORRECTIVE_ATTACHMENT_CATEGORIES}
                attachments={data.attachments}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peças</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.partsRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma peça solicitada ainda.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {data.partsRequests.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>
                        {p.partName} × {p.quantity}
                      </span>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <PartsRequestForm workOrderId={workOrderId} maintenanceRecordId={record.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Laudo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <NarrativeForm record={record} />
              {!done && (
                <div className="border-t pt-6">
                  <RecordConclusion
                    recordId={record.id}
                    missingPhotos={missingPhotos}
                    backHref={backHref}
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
