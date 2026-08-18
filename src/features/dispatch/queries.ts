import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString, toLocalDateString } from "@/lib/today-date";
import { listTickets } from "@/features/tickets/queries";
import { listWorkOrders } from "@/features/work-orders/queries";
import { listPreventivePlans } from "@/features/preventive-plans/queries";
import { TICKET_CLOSED_STATUSES, type TicketPriority, type TicketStatus } from "@/features/tickets/schema";
import type { WorkOrderStatus, WorkOrderType } from "@/features/work-orders/schema";

/**
 * Fila de trabalho do despachante (Fase 8). Junta as três coisas que o admin
 * precisa distribuir — chamados, OS e preventivas ainda sem OS — numa lista
 * só, ordenada por urgência.
 *
 * A fusão é feita em memória, sobre lotes já buscados pelas queries que já
 * existiam, em vez de uma view/SQL nova: são três `select` paralelos num
 * dataset de um hospital, e é o mesmo critério de agregação já adotado no
 * projeto (ver revisão de queries da Fase 7.3). Se algum dia o volume mudar
 * isso vira uma view materializada sem alterar a forma do retorno.
 *
 * Diferente de `/minhas-atividades` do técnico, esta tela é **online** — é
 * ação de despachante, coerente com o escopo offline decidido na Fase 6.
 */

export type DispatchKind = "ticket" | "work_order" | "preventive_plan";

export type DispatchItem = {
  id: string;
  kind: DispatchKind;
  title: string;
  clientName: string;
  unitName: string;
  /**
   * Data que ancora o item na fila (abertura, agendamento ou início do
   * período), sempre normalizada para "YYYY-MM-DD" no fuso da operação —
   * as três origens misturam `timestamptz` e `date` puro, e comparar/exibir
   * os dois formatos juntos sem normalizar erra o dia (ver today-date.ts).
   */
  date: string;
  assignedUserId: string | null;
  assignedName: string | null;
  /** Menor = mais urgente. Só para ordenação, não é exibido. */
  rank: number;
  isOverdue: boolean;
  ticketPriority?: TicketPriority;
  ticketStatus?: TicketStatus;
  workOrderType?: WorkOrderType;
  workOrderStatus?: WorkOrderStatus;
  equipmentCount?: number;
  /**
   * Quantos equipamentos desta OS o técnico fechou como "aguardando peça"
   * (Fase 11). É o que responde, na própria fila, por que uma OS com todo o
   * serviço feito não foi concluída — antes o administrador só descobria isso
   * abrindo a OS, e o técnico não tinha como avisar.
   */
  waitingPartsCount?: number;
};

const PRIORITY_RANK: Record<TicketPriority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

/** Ids de preventivas que já geraram alguma OS — essas saem da fila. */
async function findPreventivePlansWithWorkOrder(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("origin_preventive_plan_id")
    .not("origin_preventive_plan_id", "is", null);

  if (error) {
    console.error("[findPreventivePlansWithWorkOrder]", error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((r) => r.origin_preventive_plan_id)
      .filter((id): id is string => Boolean(id)),
  );
}

/**
 * Quantos equipamentos por OS ficaram aguardando peça. Um `select` só, agregado
 * em memória — mesmo critério das três listas acima (revisão de queries da Fase
 * 7.3): é a escala de um hospital, e a alternativa seria uma view nova para
 * economizar uma contagem sobre poucas centenas de linhas.
 */
async function countWaitingPartsByWorkOrder(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("work_order_id")
    .eq("resolution", "aguardando_peca");

  if (error) {
    console.error("[countWaitingPartsByWorkOrder]", error.message);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.work_order_id, (counts.get(row.work_order_id) ?? 0) + 1);
  }
  return counts;
}

export async function listDispatchQueue(): Promise<DispatchItem[]> {
  const today = getTodayDateString();

  const [tickets, workOrders, plans, plansWithWorkOrder, waitingParts] = await Promise.all([
    listTickets(),
    listWorkOrders(),
    listPreventivePlans(),
    findPreventivePlansWithWorkOrder(),
    countWaitingPartsByWorkOrder(),
  ]);

  const items: DispatchItem[] = [];

  for (const t of tickets) {
    if (TICKET_CLOSED_STATUSES.includes(t.status)) continue;
    items.push({
      id: t.id,
      kind: "ticket",
      title: t.title,
      clientName: t.clientName,
      unitName: t.unitName,
      date: toLocalDateString(t.openedAt),
      assignedUserId: t.assignedUserId,
      assignedName: t.assignedName,
      // Chamado sem técnico vem antes de um já designado de mesma prioridade:
      // é o que de fato exige ação do despachante.
      rank: PRIORITY_RANK[t.priority] * 2 + (t.assignedUserId ? 1 : 0),
      isOverdue: false,
      ticketPriority: t.priority,
      ticketStatus: t.status,
    });
  }

  for (const wo of workOrders) {
    if (wo.status === "concluida" || wo.status === "cancelada") continue;
    // Comparação de string YYYY-MM-DD contra YYYY-MM-DD, sem instanciar Date —
    // mesma precaução de fuso documentada em src/lib/format-date.ts.
    const isOverdue = Boolean(wo.scheduledDate && wo.scheduledDate < today);
    const waiting = waitingParts.get(wo.id) ?? 0;
    items.push({
      id: wo.id,
      kind: "work_order",
      title: wo.title,
      clientName: wo.clientName,
      unitName: wo.unitName,
      // scheduled_date é `date` puro (já YYYY-MM-DD); created_at é timestamptz.
      date: wo.scheduledDate ?? toLocalDateString(wo.createdAt),
      assignedUserId: wo.assignedUserId,
      assignedName: wo.assignedName,
      // OS travada por falta de peça sobe junto com as atrasadas: é uma
      // pendência do administrador, não do técnico — ele já fez o que podia.
      rank: waiting > 0 ? 1 : isOverdue ? 1 : 4,
      isOverdue,
      workOrderType: wo.type,
      workOrderStatus: wo.status,
      waitingPartsCount: waiting > 0 ? waiting : undefined,
    });
  }

  for (const p of plans) {
    if (p.status !== "active") continue;
    if (plansWithWorkOrder.has(p.id)) continue;
    items.push({
      id: p.id,
      kind: "preventive_plan",
      title: `Preventiva — ${p.unitName}`,
      clientName: p.clientName,
      unitName: p.unitName,
      date: p.periodStart,
      assignedUserId: null,
      assignedName: p.assignedName,
      rank: p.periodStart <= today ? 5 : 8,
      isOverdue: p.periodEnd < today,
      equipmentCount: p.equipmentCount,
    });
  }

  return items.sort((a, b) => a.rank - b.rank || a.date.localeCompare(b.date));
}
