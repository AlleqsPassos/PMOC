"use client";

import {
  offlineDb,
  type OfflineMaintenanceRecord,
  type OfflineTicket,
  type OfflineWorkOrder,
} from "@/lib/offline/db";
import { TICKET_CLOSED_STATUSES, type TicketStatus } from "@/features/tickets/schema";

/**
 * Leituras locais compartilhadas pelas telas do técnico (Fase 10).
 *
 * Existe porque Início, unidade, lista de corretivas, ambiente da preventiva e
 * Dashboard respondem à mesma pergunta — "o que falta aqui?" — e cinco cópias da
 * regra sairiam de sincronia na primeira mudança. Foi exatamente o que aconteceu
 * na Fase 9, quando o Início filtrava por registro pendente e o Dashboard por OS
 * aberta: as duas telas discordavam e havia trabalho inalcançável.
 *
 * Fase 11 — o carregador passou a trazer **também o trabalho fechado**. Antes o
 * técnico perdia o caminho de volta assim que a OS era concluída: a unidade
 * sumia do Início e não havia como rever (ou corrigir) o que ele mesmo tinha
 * acabado de registrar.
 */

export const OPEN_WORK_ORDER_STATUSES = ["aberta", "em_andamento"] as const;

export function isWorkOrderOpen(workOrder: OfflineWorkOrder): boolean {
  return workOrder.status !== "concluida" && workOrder.status !== "cancelada";
}

/**
 * Em qual das três divisões da unidade o atendimento cai (Fase 11).
 *
 * "Aguardando peça" é **impedimento**, não trabalho em aberto nem concluído: o
 * técnico terminou a parte dele mas o equipamento não voltou a funcionar. Era o
 * ponto que o usuário flagrou — a corretiva com peça pedida continuava contando
 * como pendência no Início, como se ele ainda tivesse o que fazer ali.
 *
 * Fase 13 — o aparelho para o qual ele **abriu um impedimento** durante a
 * preventiva também cai aqui, mesmo com o registro concluído. É o mesmo
 * princípio: a sala foi atendida, mas aquele aparelho ficou com defeito, e
 * deixá-lo entre os concluídos esconderia justamente a exceção. Por isso a
 * classificação precisa do conjunto de equipamentos com chamado aberto por ele
 * — a informação não está no registro.
 */
export type WorkBucket = "aberto" | "impedimento" | "concluido";

export function bucketOfRecord(
  record: OfflineMaintenanceRecord,
  impededEquipmentIds: ReadonlySet<string> = new Set(),
): WorkBucket {
  if (record.resolution === "aguardando_peca") return "impedimento";
  if (record.status !== "completed") return "aberto";
  return impededEquipmentIds.has(record.equipmentId) ? "impedimento" : "concluido";
}

export type UnitWork = {
  /** Todas as OS do técnico nesta unidade — abertas **e** fechadas. */
  workOrders: OfflineWorkOrder[];
  openWorkOrders: OfflineWorkOrder[];
  recordsByWorkOrder: Map<string, OfflineMaintenanceRecord[]>;
  /** Chamados atribuídos a ele por outra pessoa, ainda sem OS: trabalho a fazer. */
  assignedTickets: OfflineTicket[];
  /**
   * Chamados que ele mesmo abriu (impedimento na preventiva ou chamado ad-hoc a
   * partir do equipamento) — são defeitos que ele encontrou e não pôde resolver
   * na hora, então pertencem à divisão de impedimentos, não à de trabalho a
   * fazer. A distinção é por autoria, não por texto do título.
   */
  raisedTickets: OfflineTicket[];
};

/** Todo o trabalho do técnico agrupado por unidade — aberto, impedido e concluído. */
export async function loadWorkByUnit(): Promise<Map<string, UnitWork>> {
  const [workOrders, records, tickets, me] = await Promise.all([
    offlineDb.workOrders.toArray(),
    offlineDb.maintenanceRecords.toArray(),
    offlineDb.tickets.toArray(),
    offlineDb.meta.get("userId"),
  ]);

  const myUserId = me?.value ?? "";
  const workOrderById = new Map(workOrders.map((w) => [w.id, w]));

  const byUnit = new Map<string, UnitWork>();
  const ensure = (unitId: string) => {
    const existing = byUnit.get(unitId);
    if (existing) return existing;
    const created: UnitWork = {
      workOrders: [],
      openWorkOrders: [],
      recordsByWorkOrder: new Map(),
      assignedTickets: [],
      raisedTickets: [],
    };
    byUnit.set(unitId, created);
    return created;
  };

  for (const workOrder of workOrders) {
    const unit = ensure(workOrder.unitId);
    unit.workOrders.push(workOrder);
    if (isWorkOrderOpen(workOrder)) unit.openWorkOrders.push(workOrder);
    unit.recordsByWorkOrder.set(workOrder.id, []);
  }

  for (const record of records) {
    const workOrder = workOrderById.get(record.workOrderId);
    if (!workOrder) continue;
    byUnit.get(workOrder.unitId)?.recordsByWorkOrder.get(workOrder.id)?.push(record);
  }

  for (const ticket of tickets) {
    if (TICKET_CLOSED_STATUSES.includes(ticket.status as TicketStatus)) continue;
    const unit = ensure(ticket.unitId);
    if (ticket.openedByUserId === myUserId) unit.raisedTickets.push(ticket);
    else unit.assignedTickets.push(ticket);
  }

  return byUnit;
}

/** Equipamentos desta unidade com impedimento aberto pelo próprio técnico. */
export function impededEquipmentIds(work: UnitWork): Set<string> {
  return new Set(
    work.raisedTickets
      .map((t) => t.equipmentId)
      .filter((id): id is string => Boolean(id)),
  );
}

/** Registros da unidade em uma divisão, com a OS de cada um junto. */
export function recordsInBucket(
  work: UnitWork,
  bucket: WorkBucket,
): { record: OfflineMaintenanceRecord; workOrder: OfflineWorkOrder }[] {
  const impeded = impededEquipmentIds(work);
  const result: { record: OfflineMaintenanceRecord; workOrder: OfflineWorkOrder }[] = [];
  for (const workOrder of work.workOrders) {
    // Trabalho "em aberto" só existe dentro de OS em aberto: numa OS fechada,
    // um registro que ficou em rascunho é histórico, não tarefa pendente.
    if (bucket === "aberto" && !isWorkOrderOpen(workOrder)) continue;
    for (const record of work.recordsByWorkOrder.get(workOrder.id) ?? []) {
      if (bucketOfRecord(record, impeded) === bucket) result.push({ record, workOrder });
    }
  }
  return result;
}

export type BucketCounts = Record<WorkBucket, number>;

export function bucketCounts(work: UnitWork): BucketCounts {
  return {
    aberto: recordsInBucket(work, "aberto").length + work.assignedTickets.length,
    // O chamado que ele abriu conta uma vez só: se o equipamento tem registro,
    // o registro já entrou como impedimento pela regra acima.
    impedimento:
      recordsInBucket(work, "impedimento").length +
      work.raisedTickets.filter((t) => !t.equipmentId).length,
    concluido: recordsInBucket(work, "concluido").length,
  };
}

/** Quantos registros ainda não foram concluídos, entre os informados. */
export function pendingCount(records: OfflineMaintenanceRecord[]): number {
  return records.filter((r) => r.status !== "completed").length;
}

/**
 * OS cujo serviço terminou mas que segue aberta — a base do destaque "pronta
 * para fechar". Contrapartida obrigatória da decisão de fechar por botão: sem
 * este empurrão, a OS fica esquecida (defeito real da Fase 9).
 *
 * Um equipamento marcado "aguardando peça" **não** conta como pronta: a OS ainda
 * depende de material, e sugerir o fechamento ali seria dizer ao técnico que
 * está tudo resolvido quando não está.
 */
export function readyToClose(records: OfflineMaintenanceRecord[]): boolean {
  return (
    records.length > 0 &&
    records.every((r) => r.status === "completed") &&
    !records.some((r) => r.resolution === "aguardando_peca")
  );
}

export function waitingForParts(records: OfflineMaintenanceRecord[]): boolean {
  return records.some((r) => r.resolution === "aguardando_peca");
}
