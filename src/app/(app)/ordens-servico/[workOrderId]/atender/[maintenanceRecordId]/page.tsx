import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getMaintenanceRecordDetail, listMeasurementTypes } from "@/features/maintenance/queries";
import { listApplicableChecklistTemplates } from "@/features/checklist-templates/queries";
import { listAttachmentsByMaintenanceRecord } from "@/features/attachments/queries";
import { listPartsRequestsByWorkOrder } from "@/features/parts-requests/queries";
import { ChecklistSection } from "@/features/maintenance/components/checklist-section";
import { MeasurementSection } from "@/features/maintenance/components/measurement-section";
import { NarrativeForm } from "@/features/maintenance/components/narrative-form";
import { RecordLifecycleButtons } from "@/features/maintenance/components/record-lifecycle-buttons";
import { AttachmentUploaderGroup } from "@/features/attachments/components/attachment-uploader";
import { ATTACHMENT_CATEGORY } from "@/features/attachments/schema";
import { PartsRequestForm } from "@/features/parts-requests/components/parts-request-form";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Atendimento — PMOC+" };

export default async function AtenderPage(
  props: PageProps<"/ordens-servico/[workOrderId]/atender/[maintenanceRecordId]">,
) {
  const { workOrderId, maintenanceRecordId } = await props.params;
  await requireUser();

  const [canExecute, canManage] = await Promise.all([
    hasPermission("execute_work_order"),
    hasPermission("manage_work_orders"),
  ]);
  if (!canExecute && !canManage) {
    return <AccessDenied message="Você não tem permissão para executar ordens de serviço." />;
  }

  const record = await getMaintenanceRecordDetail(maintenanceRecordId);
  if (!record || record.workOrderId !== workOrderId) notFound();

  const [templates, measurementTypes, attachments, partsRequests, user] = await Promise.all([
    listApplicableChecklistTemplates(record.workOrderType),
    listMeasurementTypes(),
    listAttachmentsByMaintenanceRecord(record.id),
    listPartsRequestsByWorkOrder(workOrderId),
    requireUser(),
  ]);

  const recordPartsRequests = partsRequests; // work order todo tem poucos itens; sem filtro extra por ora.

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href={`/ordens-servico/${workOrderId}`} className="hover:underline">
            {record.workOrderTitle}
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
          <RecordLifecycleButtons
            recordId={record.id}
            workOrderId={workOrderId}
            startedAt={record.startedAt}
            status={record.status}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistSection
            workOrderId={workOrderId}
            recordId={record.id}
            items={record.checklistItems}
            templates={templates}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medições</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasurementSection
            workOrderId={workOrderId}
            recordId={record.id}
            measurements={record.measurements}
            types={measurementTypes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentUploaderGroup
            companyId={user.companyId}
            workOrderId={workOrderId}
            maintenanceRecordId={record.id}
            equipmentId={record.equipmentId}
            categories={[...ATTACHMENT_CATEGORY]}
            attachments={attachments}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peças</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recordPartsRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma peça solicitada ainda.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recordPartsRequests.map((p) => (
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
          <NarrativeForm workOrderId={workOrderId} record={record} />
        </CardContent>
      </Card>
    </div>
  );
}
