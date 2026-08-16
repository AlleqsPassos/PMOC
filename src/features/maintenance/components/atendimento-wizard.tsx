"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { ChecklistSection } from "@/features/maintenance/components/checklist-section";
import { MeasurementSection } from "@/features/maintenance/components/measurement-section";
import { NarrativeForm } from "@/features/maintenance/components/narrative-form";
import { RecordLifecycleButtons } from "@/features/maintenance/components/record-lifecycle-buttons";
import { AttachmentUploaderGroup } from "@/features/attachments/components/attachment-uploader";
import { ATTACHMENT_CATEGORY } from "@/features/attachments/schema";
import { PartsRequestForm } from "@/features/parts-requests/components/parts-request-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Fluxo de atendimento — Fase 6, inteiramente local-first. Tudo que a
 * página antes buscava via Server Component (getMaintenanceRecordDetail
 * etc., Fase 4.2) agora vem de uma única `useLiveQuery` no Dexie: os dados
 * já chegaram por `pullTechnicianData()` (disparado pelo SyncStatusBadge no
 * layout) antes do técnico navegar até aqui. Nenhuma seção depende de rede
 * — cada uma grava local e enfileira no outbox (ver offline-actions.ts de
 * cada feature: maintenance, attachments, parts-requests).
 */
export function AtendimentoWizard({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
  const data = useLiveQuery(async () => {
    const [record, workOrder, checklistItems, measurements, partsRequests, attachments, templates, measurementTypes] =
      await Promise.all([
        offlineDb.maintenanceRecords.get(maintenanceRecordId),
        offlineDb.workOrders.get(workOrderId),
        offlineDb.checklistItems.where("maintenanceRecordId").equals(maintenanceRecordId).toArray(),
        offlineDb.measurements.where("maintenanceRecordId").equals(maintenanceRecordId).toArray(),
        offlineDb.partsRequests.where("maintenanceRecordId").equals(maintenanceRecordId).toArray(),
        offlineDb.attachments.where("maintenanceRecordId").equals(maintenanceRecordId).toArray(),
        offlineDb.checklistTemplates.toArray(),
        offlineDb.measurementTypes.toArray(),
      ]);
    const meta = await offlineDb.meta.get("companyId");
    return {
      record,
      workOrder,
      checklistItems,
      measurements,
      partsRequests,
      attachments,
      templates,
      measurementTypes,
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

  const applicableTemplates = data.templates.filter(
    (t) => t.maintenanceType === workOrder.type || t.maintenanceType === "ambos",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/minhas-atividades" className="hover:underline">
            {workOrder.title}
          </Link>{" "}
          / Atender {record.equipmentTag}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{record.equipmentTag}</h1>
            <Badge variant={record.status === "completed" ? "default" : "outline"}>
              {record.status === "completed" ? "Concluído" : "Rascunho"}
            </Badge>
          </div>
          <RecordLifecycleButtons recordId={record.id} startedAt={record.startedAt} status={record.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistSection
            recordId={record.id}
            items={data.checklistItems}
            templates={applicableTemplates}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medições</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasurementSection
            recordId={record.id}
            measurements={data.measurements}
            types={data.measurementTypes}
          />
        </CardContent>
      </Card>

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
            categories={[...ATTACHMENT_CATEGORY]}
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
        <CardContent>
          <NarrativeForm record={record} />
        </CardContent>
      </Card>
    </div>
  );
}
