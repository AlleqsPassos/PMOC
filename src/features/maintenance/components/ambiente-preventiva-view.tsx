"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Play } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import {
  completeMaintenanceRecordsOffline,
  startMaintenanceRecordsOffline,
} from "@/features/maintenance/offline-actions";
import { PREVENTIVE_MEASUREMENT_KEYS } from "@/features/maintenance/schema";
import { MeasurementGrid } from "@/features/maintenance/components/measurement-grid";
import {
  ChecklistPorTipo,
  type ChecklistGroup,
} from "@/features/maintenance/components/checklist-por-tipo";
import { ImpedimentoDialog } from "@/features/tickets/components/impedimento-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SEM_TIPO = "Sem tipo definido";

/** Casamento tipo↔template por texto normalizado — os dois lados são texto livre no schema. */
function normalizeType(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * A preventiva de um ambiente inteiro (Fase 10) — a tela central da fase.
 *
 * Não cabe na rota `atender/[maintenanceRecordId]`, que trata **um** registro:
 * aqui o técnico preenche vários aparelhos em sequência, na mesma tela, porque
 * é assim que a preventiva acontece. Ele entra na sala e trabalha nela.
 *
 * Ordem, como o usuário descreveu: iniciar → por equipamento, tag e as cinco
 * medições prontas para preencher (mais o botão de impedimento ao lado) → no
 * fim, o checklist por tipo de equipamento → concluir o ambiente.
 */
export function AmbientePreventivaView({
  unitId,
  environmentId,
}: {
  unitId: string;
  environmentId: string;
}) {
  const router = useRouter();
  const [isStarting, startStarting] = useTransition();
  const [isFinishing, startFinishing] = useTransition();

  const data = useLiveQuery(async () => {
    const [
      unit,
      environment,
      workOrders,
      allRecords,
      equipment,
      measurementTypes,
      templates,
      templateItems,
      meta,
    ] = await Promise.all([
      offlineDb.units.get(unitId),
      offlineDb.environments.get(environmentId),
      offlineDb.workOrders.where("unitId").equals(unitId).toArray(),
      offlineDb.maintenanceRecords.toArray(),
      offlineDb.equipment.where("environmentId").equals(environmentId).toArray(),
      offlineDb.measurementTypes.toArray(),
      offlineDb.checklistTemplates.toArray(),
      offlineDb.checklistTemplateItems.toArray(),
      offlineDb.meta.get("companyId"),
    ]);

    const preventivaIds = new Set(
      workOrders
        .filter(
          (w) =>
            w.type === "preventiva" && w.status !== "concluida" && w.status !== "cancelada",
        )
        .map((w) => w.id),
    );
    const equipmentById = new Map(equipment.map((e) => [e.id, e]));

    const records = allRecords.filter(
      (r) => preventivaIds.has(r.workOrderId) && equipmentById.has(r.equipmentId),
    );
    const recordIds = records.map((r) => r.id);

    const measurements = recordIds.length
      ? await offlineDb.measurements
          .where("maintenanceRecordId")
          .anyOf(recordIds)
          .toArray()
      : [];
    const checklistItems = recordIds.length
      ? await offlineDb.checklistItems
          .where("maintenanceRecordId")
          .anyOf(recordIds)
          .toArray()
      : [];

    // Grade fixa, na ordem da especificação — e só os tipos que existem de fato
    // no catálogo, para uma medição removida pelo admin não quebrar a tela.
    const gridTypes = PREVENTIVE_MEASUREMENT_KEYS.map((key) =>
      measurementTypes.find((t) => t.key === key),
    ).filter((t) => t !== undefined);

    const equipments = records
      .map((record) => {
        const eq = equipmentById.get(record.equipmentId);
        return {
          record,
          tag: record.equipmentTag,
          type: eq?.type ?? null,
          measurements: measurements.filter((m) => m.maintenanceRecordId === record.id),
        };
      })
      .sort((a, b) => a.tag.localeCompare(b.tag));

    // Um grupo de checklist por tipo presente no ambiente.
    const byType = new Map<string, typeof equipments>();
    for (const item of equipments) {
      const key = item.type?.trim() || SEM_TIPO;
      byType.set(key, [...(byType.get(key) ?? []), item]);
    }

    const checklistGroups: ChecklistGroup[] = Array.from(byType.entries()).map(
      ([equipmentType, items]) => {
        const template = templates.find(
          (t) =>
            (t.maintenanceType === "preventiva" || t.maintenanceType === "ambos") &&
            normalizeType(t.equipmentType) === normalizeType(equipmentType) &&
            normalizeType(t.equipmentType) !== "",
        );
        const groupRecordIds = items.map((i) => i.record.id);

        return {
          equipmentType,
          templateName: template?.name ?? null,
          recordIds: groupRecordIds,
          items: (template
            ? templateItems.filter((i) => i.checklistTemplateId === template.id)
            : []
          )
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((templateItem) => ({
              id: templateItem.id,
              label: templateItem.label,
              // Marcado só quando vale para todos os equipamentos do tipo — é o
              // que a caixa promete ao ser marcada.
              checked: groupRecordIds.every((recordId) =>
                checklistItems.some(
                  (c) =>
                    c.maintenanceRecordId === recordId &&
                    c.templateItemId === templateItem.id &&
                    c.status === "ok",
                ),
              ),
            })),
        };
      },
    );

    return {
      unitName: unit?.name ?? "Unidade",
      environmentName: environment?.name ?? "Ambiente",
      workOrderId: records[0]?.workOrderId ?? "",
      equipments,
      gridTypes,
      checklistGroups,
      companyId: meta?.value ?? "",
      notStarted: records.filter((r) => !r.startedAt).map((r) => r.id),
      openRecordIds: records.filter((r) => r.status !== "completed").map((r) => r.id),
    };
  }, [unitId, environmentId]);

  if (!data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (data.equipments.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nenhum equipamento desta sala está numa preventiva em aberto atribuída a
          você.
        </CardContent>
      </Card>
    );
  }

  const started = data.notStarted.length === 0;
  const finished = data.openRecordIds.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href={`/minhas-atividades/${unitId}`} className="hover:underline">
            {data.unitName}
          </Link>{" "}
          /{" "}
          <Link
            href={`/minhas-atividades/${unitId}/preventivas`}
            className="hover:underline"
          >
            Preventivas
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.environmentName}
          </h1>
          {finished ? (
            <Badge variant="secondary">Ambiente concluído</Badge>
          ) : (
            !started && (
              <Button
                disabled={isStarting}
                onClick={() =>
                  startStarting(() => startMaintenanceRecordsOffline(data.notStarted))
                }
              >
                <Play className="size-4" />
                {isStarting ? "Iniciando…" : "Iniciar atividade"}
              </Button>
            )
          )}
        </div>
      </div>

      {!started && !finished ? (
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
              <CardTitle className="text-base">Equipamentos</CardTitle>
              <CardDescription>
                Preencha as medições de cada aparelho. Encontrou defeito? Abra o
                impedimento ali mesmo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {data.equipments.map(({ record, tag, measurements }) => (
                <div key={record.id} className="flex flex-col gap-3 border-b pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{tag}</span>
                    <ImpedimentoDialog
                      companyId={data.companyId}
                      workOrderId={record.workOrderId}
                      maintenanceRecordId={record.id}
                      equipmentId={record.equipmentId}
                      equipmentTag={tag}
                    />
                  </div>
                  <MeasurementGrid
                    recordId={record.id}
                    types={data.gridTypes}
                    measurements={measurements}
                    disabled={finished}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <ChecklistPorTipo groups={data.checklistGroups} disabled={finished} />

          {!finished && (
            <div className="flex justify-end">
              <Button
                disabled={isFinishing}
                onClick={() =>
                  startFinishing(async () => {
                    await completeMaintenanceRecordsOffline(data.openRecordIds);
                    toast.success(`${data.environmentName} concluído.`);
                    router.push(`/minhas-atividades/${unitId}/preventivas`);
                  })
                }
              >
                <CircleCheck className="size-4" />
                {isFinishing ? "Concluindo…" : "Concluir ambiente"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
