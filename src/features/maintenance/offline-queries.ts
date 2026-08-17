"use client";

import { offlineDb, type OfflineMaintenanceRecord, type OfflineWorkOrder } from "@/lib/offline/db";
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
 * Regra única, aqui: **o que define trabalho pendente é a OS estar em aberto.**
 * Registro concluído dentro de OS aberta continua aparecendo, marcado.
 */

export const OPEN_WORK_ORDER_STATUSES = ["aberta", "em_andamento"] as const;

export function isWorkOrderOpen(workOrder: OfflineWorkOrder): boolean {
  return workOrder.status !== "concluida" && workOrder.status !== "cancelada";
}

export type UnitWork = {
  workOrders: OfflineWorkOrder[];
  recordsByWorkOrder: Map<string, OfflineMaintenanceRecord[]>;
  openTicketCount: number;
};

/** OS em aberto do técnico, com os registros de cada uma, agrupadas por unidade. */
export async function loadOpenWorkByUnit(): Promise<Map<string, UnitWork>> {
  const [allWorkOrders, records, tickets] = await Promise.all([
    offlineDb.workOrders.toArray(),
    offlineDb.maintenanceRecords.toArray(),
    offlineDb.tickets.toArray(),
  ]);

  const workOrders = allWorkOrders.filter(isWorkOrderOpen);
  const openWorkOrderById = new Map(workOrders.map((w) => [w.id, w]));

  const byUnit = new Map<string, UnitWork>();
  const ensure = (unitId: string) => {
    const existing = byUnit.get(unitId);
    if (existing) return existing;
    const created: UnitWork = {
      workOrders: [],
      recordsByWorkOrder: new Map(),
      openTicketCount: 0,
    };
    byUnit.set(unitId, created);
    return created;
  };

  for (const workOrder of workOrders) {
    const unit = ensure(workOrder.unitId);
    unit.workOrders.push(workOrder);
    unit.recordsByWorkOrder.set(workOrder.id, []);
  }

  for (const record of records) {
    const workOrder = openWorkOrderById.get(record.workOrderId);
    if (!workOrder) continue;
    byUnit.get(workOrder.unitId)?.recordsByWorkOrder.get(workOrder.id)?.push(record);
  }

  for (const ticket of tickets) {
    if (TICKET_CLOSED_STATUSES.includes(ticket.status as TicketStatus)) continue;
    ensure(ticket.unitId).openTicketCount += 1;
  }

  return byUnit;
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
