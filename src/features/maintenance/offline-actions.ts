"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";
import type { ChecklistItemStatus } from "@/features/maintenance/schema";

/**
 * Equivalente offline de features/maintenance/actions.ts (Fase 4) — em vez
 * de Server Action, cada função grava otimista no Dexie e enfileira no
 * outbox (ver src/lib/offline/). Substitui inteiramente o antigo
 * actions.ts (removido nesta fase — nenhum outro caller restava).
 *
 * Guarda de concorrência otimista (seção 12 da arquitetura) só se aplica à
 * transição de status "concluir" — narrativa e "iniciar" usam last-write-
 * wins simples, mesma decisão documentada. Guardar todas as mutações
 * encadeadas do mesmo registro criaria falso conflito com a própria edição
 * sequencial do técnico (o servidor só reflete a mutação anterior depois
 * que ela sincroniza, não no momento em que a próxima é enfileirada).
 *
 * IMPORTANTE — todo payload de update por upsert precisa incluir
 * `company_id` mesmo quando ele não muda: `.upsert(payload, {onConflict:'id'})`
 * vira `INSERT ... ON CONFLICT (id) DO UPDATE` no Postgres, e a policy de
 * INSERT (com company_id = auth_company_id() no with check) é avaliada
 * contra a linha proposta *antes* de o Postgres sequer checar se há
 * conflito — se `company_id` não vier no payload, a linha proposta tem
 * company_id NULL e a RLS rejeita com "new row violates row-level security
 * policy", mesmo a linha já existindo e a intenção sendo só um update. Bug
 * real encontrado no QA offline desta fase.
 */

async function getMeta() {
  const [company, user] = await Promise.all([
    offlineDb.meta.get("companyId"),
    offlineDb.meta.get("userId"),
  ]);
  return { companyId: company?.value ?? "", userId: user?.value ?? "" };
}

export async function startMaintenanceRecordOffline(recordId: string): Promise<void> {
  const record = await offlineDb.maintenanceRecords.get(recordId);
  if (!record || record.startedAt) return;

  const { companyId, userId } = await getMeta();
  const startedAt = new Date().toISOString();

  await offlineDb.maintenanceRecords.update(recordId, {
    startedAt,
    technicianUserId: userId,
    updatedAt: startedAt,
  });
  await enqueue({
    entityTable: "maintenance_records",
    entityId: recordId,
    operation: "update",
    payload: {
      id: recordId,
      company_id: companyId,
      started_at: startedAt,
      technician_user_id: userId,
    },
  });
  requestSync();
}

/** Copia os itens do template (já em cache local, ver pull-sync.ts) — bloqueia se já houver itens. */
export async function applyChecklistTemplateOffline(
  recordId: string,
  templateId: string,
): Promise<{ error?: string }> {
  const existing = await offlineDb.checklistItems
    .where("maintenanceRecordId")
    .equals(recordId)
    .count();
  if (existing > 0) {
    return { error: "Este atendimento já tem itens de checklist." };
  }

  const templateItems = await offlineDb.checklistTemplateItems
    .where("checklistTemplateId")
    .equals(templateId)
    .sortBy("orderIndex");
  if (templateItems.length === 0) {
    return { error: "Template sem itens ou não encontrado localmente." };
  }

  const { companyId } = await getMeta();
  const newItems = templateItems.map((t) => ({
    id: crypto.randomUUID(),
    maintenanceRecordId: recordId,
    templateItemId: t.id,
    labelSnapshot: t.label,
    status: "ok" as ChecklistItemStatus,
    note: null,
  }));

  await offlineDb.checklistItems.bulkAdd(newItems);
  for (const item of newItems) {
    await enqueue({
      entityTable: "maintenance_record_checklist_items",
      entityId: item.id,
      operation: "insert",
      payload: {
        id: item.id,
        company_id: companyId,
        maintenance_record_id: recordId,
        template_item_id: item.templateItemId,
        label_snapshot: item.labelSnapshot,
      },
    });
  }
  requestSync();
  return {};
}

export async function addAdhocChecklistItemOffline(
  recordId: string,
  label: string,
): Promise<void> {
  const { companyId } = await getMeta();
  const id = crypto.randomUUID();

  await offlineDb.checklistItems.add({
    id,
    maintenanceRecordId: recordId,
    templateItemId: null,
    labelSnapshot: label,
    status: "ok",
    note: null,
  });
  await enqueue({
    entityTable: "maintenance_record_checklist_items",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      maintenance_record_id: recordId,
      template_item_id: null,
      label_snapshot: label,
    },
  });
  requestSync();
}

export async function updateChecklistItemStatusOffline(
  itemId: string,
  status: ChecklistItemStatus,
): Promise<void> {
  const { companyId } = await getMeta();
  await offlineDb.checklistItems.update(itemId, { status });
  await enqueue({
    entityTable: "maintenance_record_checklist_items",
    entityId: itemId,
    operation: "update",
    payload: { id: itemId, company_id: companyId, status },
  });
  requestSync();
}

export async function addMeasurementOffline(
  recordId: string,
  params: {
    measurementTypeId: string;
    typeLabel: string;
    valueNumeric: number | null;
    valueText: string | null;
    unit: string | null;
    note: string | null;
  },
): Promise<void> {
  const { companyId, userId } = await getMeta();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await offlineDb.measurements.add({
    id,
    maintenanceRecordId: recordId,
    measurementTypeId: params.measurementTypeId,
    typeLabel: params.typeLabel,
    valueNumeric: params.valueNumeric,
    valueText: params.valueText,
    unit: params.unit,
    note: params.note,
    createdAt,
  });
  await enqueue({
    entityTable: "measurements",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      maintenance_record_id: recordId,
      measurement_type_id: params.measurementTypeId,
      value_numeric: params.valueNumeric,
      value_text: params.valueText,
      unit: params.unit,
      note: params.note,
      created_by: userId,
    },
  });
  requestSync();
}

export async function updateMaintenanceNarrativeOffline(
  recordId: string,
  fields: {
    causeIdentified: string | null;
    servicePerformed: string | null;
    recommendation: string | null;
    diagnosis: string | null;
    notes: string | null;
  },
): Promise<void> {
  const { companyId } = await getMeta();
  await offlineDb.maintenanceRecords.update(recordId, fields);
  await enqueue({
    entityTable: "maintenance_records",
    entityId: recordId,
    operation: "update",
    payload: {
      id: recordId,
      company_id: companyId,
      cause_identified: fields.causeIdentified,
      service_performed: fields.servicePerformed,
      recommendation: fields.recommendation,
      diagnosis: fields.diagnosis,
      notes: fields.notes,
    },
  });
  requestSync();
}

/** Único ponto com guarda otimista — fecha o atendimento, transição terminal. */
export async function completeMaintenanceRecordOffline(recordId: string): Promise<void> {
  const record = await offlineDb.maintenanceRecords.get(recordId);
  const { companyId } = await getMeta();
  const completedAt = new Date().toISOString();

  await offlineDb.maintenanceRecords.update(recordId, {
    status: "completed",
    completedAt,
    updatedAt: completedAt,
  });
  await enqueue({
    entityTable: "maintenance_records",
    entityId: recordId,
    operation: "update",
    payload: {
      id: recordId,
      company_id: companyId,
      status: "completed",
      completed_at: completedAt,
    },
    guardUpdatedAt: record?.updatedAt,
  });
  requestSync();
}
