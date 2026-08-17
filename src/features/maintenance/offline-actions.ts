"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";
import type {
  ChecklistItemStatus,
  MaintenanceResolution,
} from "@/features/maintenance/schema";

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

/**
 * Move a OS para "em andamento" na primeira vez que o técnico começa a
 * trabalhar nela. Sem isto, o administrador via a OS "Aberta" enquanto o
 * atendimento acontecia — foi o defeito encontrado no teste real da Fase 9,
 * onde o técnico não tinha caminho nenhum para mexer no status da OS.
 *
 * Idempotente: se a OS já saiu de `aberta`, não faz nada. Last-write-wins sem
 * guarda otimista, mesma decisão de `startMaintenanceRecordOffline` — é uma
 * transição de mão única e disputa aqui é ruído, não conflito real.
 *
 * A RLS de `work_orders` (0021) aceita `execute_work_order`, então o técnico
 * pode fazer isso sem nenhuma permissão nova.
 */
async function markWorkOrderInProgressOffline(workOrderId: string): Promise<void> {
  const workOrder = await offlineDb.workOrders.get(workOrderId);
  if (!workOrder || workOrder.status !== "aberta") return;

  const { companyId } = await getMeta();
  const startedAt = workOrder.startedAt ?? new Date().toISOString();

  await offlineDb.workOrders.update(workOrderId, {
    status: "em_andamento",
    startedAt,
  });
  await enqueue({
    entityTable: "work_orders",
    entityId: workOrderId,
    operation: "update",
    payload: {
      id: workOrderId,
      company_id: companyId,
      status: "em_andamento",
      started_at: startedAt,
    },
  });
}

export async function startMaintenanceRecordOffline(recordId: string): Promise<void> {
  const record = await offlineDb.maintenanceRecords.get(recordId);
  if (!record) return;

  const { companyId, userId } = await getMeta();

  if (!record.startedAt) {
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
  }

  await markWorkOrderInProgressOffline(record.workOrderId);
  requestSync();
}

/**
 * "Iniciar atividade" da preventiva vale para o ambiente inteiro, não para um
 * aparelho — é assim que o trabalho acontece: ele entra na sala e começa. Um
 * insert por registro, em ordem, mais uma única transição da OS.
 */
export async function startMaintenanceRecordsOffline(recordIds: string[]): Promise<void> {
  for (const id of recordIds) {
    await startMaintenanceRecordOffline(id);
  }
}

/**
 * Fecha a OS. Botão explícito do técnico, por decisão do usuário — não fecha
 * sozinha quando o último equipamento termina.
 *
 * A contrapartida dessa escolha é o risco de a OS ficar esquecida aberta com
 * tudo pronto (exatamente o que aconteceu na Fase 9), e é por isso que a tela
 * da unidade e o Dashboard destacam "pronta para fechar" — o empurrão fica na
 * interface, não numa regra automática.
 */
export async function completeWorkOrderOffline(workOrderId: string): Promise<void> {
  const workOrder = await offlineDb.workOrders.get(workOrderId);
  if (!workOrder || workOrder.status === "concluida" || workOrder.status === "cancelada") {
    return;
  }

  const { companyId } = await getMeta();
  const finishedAt = new Date().toISOString();

  await offlineDb.workOrders.update(workOrderId, {
    status: "concluida",
    finishedAt,
  });
  await enqueue({
    entityTable: "work_orders",
    entityId: workOrderId,
    operation: "update",
    payload: {
      id: workOrderId,
      company_id: companyId,
      status: "concluida",
      finished_at: finishedAt,
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

/**
 * Conclui de uma vez os equipamentos de um ambiente — o fim da preventiva
 * daquela sala. A preventiva não tem "resolvido/aguardando peça" por aparelho: o
 * serviço programado foi feito, e um defeito encontrado no caminho vira uma
 * corretiva própria (ver `ImpedimentoDialog`), não um desfecho deste registro.
 */
export async function completeMaintenanceRecordsOffline(
  recordIds: string[],
  resolution: MaintenanceResolution = "resolvido",
): Promise<void> {
  for (const id of recordIds) {
    const record = await offlineDb.maintenanceRecords.get(id);
    if (!record || record.status === "completed") continue;
    await completeMaintenanceRecordOffline(id, resolution);
  }
}

/**
 * Uma célula da grade de medições da preventiva (Fase 10).
 *
 * **Grava por cima**, não acumula: se já existe medição daquele tipo naquele
 * registro, é UPDATE. A medição da Fase 4 era um evento registrado uma vez e a
 * arquitetura a tratava como aditiva; virou um campo preenchível, e um campo
 * preenchível precisa aceitar correção — senão trocar 22 por 24 deixaria dois
 * valores de "temperatura de retorno" no mesmo equipamento, sem dizer qual vale.
 * A policy de update em `measurements` (0042) existe exatamente por isso.
 *
 * Valor vazio apaga o número (grava null) em vez de remover a linha: não há
 * policy de delete e, para a grade, "em branco" e "linha inexistente" são a
 * mesma coisa na tela.
 */
export async function setMeasurementValueOffline(params: {
  recordId: string;
  measurementTypeId: string;
  typeLabel: string;
  unit: string | null;
  valueNumeric: number | null;
}): Promise<void> {
  const { companyId, userId } = await getMeta();

  const existing = await offlineDb.measurements
    .where("[maintenanceRecordId+measurementTypeId]")
    .equals([params.recordId, params.measurementTypeId])
    .first();

  if (existing) {
    await offlineDb.measurements.update(existing.id, {
      valueNumeric: params.valueNumeric,
      unit: params.unit,
    });
    await enqueue({
      entityTable: "measurements",
      entityId: existing.id,
      operation: "update",
      payload: {
        id: existing.id,
        company_id: companyId,
        value_numeric: params.valueNumeric,
        unit: params.unit,
      },
    });
    requestSync();
    return;
  }

  const id = crypto.randomUUID();
  await offlineDb.measurements.add({
    id,
    maintenanceRecordId: params.recordId,
    measurementTypeId: params.measurementTypeId,
    typeLabel: params.typeLabel,
    valueNumeric: params.valueNumeric,
    valueText: null,
    unit: params.unit,
    note: null,
    createdAt: new Date().toISOString(),
  });
  await enqueue({
    entityTable: "measurements",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      maintenance_record_id: params.recordId,
      measurement_type_id: params.measurementTypeId,
      value_numeric: params.valueNumeric,
      value_text: null,
      unit: params.unit,
      note: null,
      created_by: userId,
    },
  });
  requestSync();
}

/**
 * O checklist da preventiva é uma lista só, no fim do ambiente, mas o schema
 * guarda a resposta **por equipamento** (`maintenance_record_checklist_items`)
 * — e tem que continuar assim, senão o PMOC sairia com o checklist de um
 * aparelho só. Então um toque do técnico escreve N linhas: uma para cada
 * equipamento daquele tipo no ambiente. Decisão do usuário, para não obrigá-lo
 * a marcar a mesma coisa cinco vezes.
 *
 * Desmarcar vira `nao_aplica` em vez de apagar a linha: não existe policy de
 * delete nessa tabela (0029), e "não avaliado" é informação verdadeira no
 * documento — melhor que o silêncio de uma linha ausente.
 */
export async function setGroupChecklistItemOffline(params: {
  recordIds: string[];
  templateItemId: string;
  label: string;
  checked: boolean;
}): Promise<void> {
  const { companyId } = await getMeta();
  const status: ChecklistItemStatus = params.checked ? "ok" : "nao_aplica";

  for (const recordId of params.recordIds) {
    const existing = await offlineDb.checklistItems
      .where("maintenanceRecordId")
      .equals(recordId)
      .filter((i) => i.templateItemId === params.templateItemId)
      .first();

    if (existing) {
      await offlineDb.checklistItems.update(existing.id, { status });
      await enqueue({
        entityTable: "maintenance_record_checklist_items",
        entityId: existing.id,
        operation: "update",
        payload: { id: existing.id, company_id: companyId, status },
      });
      continue;
    }

    // Só cria linha quando o técnico marca. Pré-criar tudo como "não avaliado"
    // ao abrir o ambiente enfileiraria dezenas de inserts que talvez nunca
    // signifiquem nada.
    if (!params.checked) continue;

    const id = crypto.randomUUID();
    await offlineDb.checklistItems.add({
      id,
      maintenanceRecordId: recordId,
      templateItemId: params.templateItemId,
      labelSnapshot: params.label,
      status,
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
        template_item_id: params.templateItemId,
        label_snapshot: params.label,
        status,
      },
    });
  }
  requestSync();
}

const NARRATIVE_COLUMNS = {
  causeIdentified: "cause_identified",
  servicePerformed: "service_performed",
  recommendation: "recommendation",
  diagnosis: "diagnosis",
  notes: "notes",
} as const;

/**
 * Salva só os campos que o chamador de fato informou.
 *
 * Era um objeto fechado com os cinco campos narrativos, o que estava certo
 * enquanto o formulário tinha os cinco. O laudo do técnico virou três
 * (diagnóstico, recomendação, observações — Fase 10), e um payload fechado
 * apagaria `cause_identified`/`service_performed` de qualquer registro que já os
 * tivesse preenchido, só por eles não estarem mais na tela.
 */
export async function updateMaintenanceNarrativeOffline(
  recordId: string,
  fields: Partial<Record<keyof typeof NARRATIVE_COLUMNS, string | null>>,
): Promise<void> {
  const { companyId } = await getMeta();

  const payload: Record<string, unknown> = { id: recordId, company_id: companyId };
  for (const [key, column] of Object.entries(NARRATIVE_COLUMNS)) {
    const value = fields[key as keyof typeof NARRATIVE_COLUMNS];
    if (value !== undefined) payload[column] = value;
  }

  await offlineDb.maintenanceRecords.update(recordId, fields);
  await enqueue({
    entityTable: "maintenance_records",
    entityId: recordId,
    operation: "update",
    payload,
  });
  requestSync();
}

/**
 * Único ponto com guarda otimista — fecha o atendimento, transição terminal.
 *
 * `resolution` (Fase 10) é o que o técnico escolhe no fim do laudo: resolvido ou
 * aguardando peça. O `status` continua indo para `completed` nos dois casos —
 * ele terminou a parte dele — e é a resolução que diz ao administrador se o
 * problema morreu ali ou se a OS ainda depende de material.
 */
export async function completeMaintenanceRecordOffline(
  recordId: string,
  resolution: MaintenanceResolution,
): Promise<void> {
  const record = await offlineDb.maintenanceRecords.get(recordId);
  const { companyId } = await getMeta();
  const completedAt = new Date().toISOString();

  await offlineDb.maintenanceRecords.update(recordId, {
    status: "completed",
    resolution,
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
      resolution,
      completed_at: completedAt,
    },
    guardUpdatedAt: record?.updatedAt,
  });
  requestSync();
}
