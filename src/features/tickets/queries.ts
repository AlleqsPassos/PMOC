import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TicketPriority, TicketStatus } from "@/features/tickets/schema";
import { TICKET_CLOSED_STATUSES } from "@/features/tickets/schema";

const LIST_SELECT =
  "id, title, priority, status, opened_at, client:clients(corporate_name), unit:units(name), equipment:equipment(tag), assigned:users!tickets_assigned_user_id_fkey(full_name)";

export type TicketListItem = {
  id: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  openedAt: string;
  clientName: string;
  unitName: string;
  equipmentTag: string | null;
  assignedName: string | null;
};

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapListRow(row: {
  id: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  opened_at: string;
  client: { corporate_name: string } | { corporate_name: string }[] | null;
  unit: { name: string } | { name: string }[] | null;
  equipment: { tag: string } | { tag: string }[] | null;
  assigned: { full_name: string } | { full_name: string }[] | null;
}): TicketListItem {
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    openedAt: row.opened_at,
    clientName: firstOf(row.client)?.corporate_name ?? "—",
    unitName: firstOf(row.unit)?.name ?? "—",
    equipmentTag: firstOf(row.equipment)?.tag ?? null,
    assignedName: firstOf(row.assigned)?.full_name ?? null,
  };
}

type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  clientId?: string;
  unitId?: string;
};

/** Lista global de chamados (mais recentes primeiro), com filtros opcionais. */
export async function listTickets(
  filters: TicketFilters = {},
): Promise<TicketListItem[]> {
  const supabase = await createClient();

  let query = supabase.from("tickets").select(LIST_SELECT).order("opened_at", {
    ascending: false,
  });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.unitId) query = query.eq("unit_id", filters.unitId);

  const { data, error } = await query;

  if (error) {
    console.error("[listTickets]", error.message);
    return [];
  }

  return (data ?? []).map(mapListRow);
}

/** Chamados atribuídos ao usuário logado e ainda em aberto — "Minhas atividades". */
export async function listMyTickets(userId: string): Promise<TicketListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tickets")
    .select(LIST_SELECT)
    .eq("assigned_user_id", userId)
    .not("status", "in", `(${TICKET_CLOSED_STATUSES.join(",")})`)
    .order("opened_at", { ascending: true });

  if (error) {
    console.error("[listMyTickets]", error.message);
    return [];
  }

  return (data ?? []).map(mapListRow);
}

export type TicketDetail = {
  id: string;
  title: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  notes: string | null;
  openedAt: string;
  clientId: string;
  clientName: string;
  unitId: string;
  unitName: string;
  sectorName: string | null;
  environmentName: string | null;
  equipmentId: string | null;
  equipmentTag: string | null;
  assignedUserId: string | null;
  assignedName: string | null;
  openedByName: string;
  workOrderId: string | null;
};

export async function getTicketById(ticketId: string): Promise<TicketDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, title, description, priority, status, notes, opened_at, work_order_id,
       client_id, client:clients(corporate_name),
       unit_id, unit:units(name),
       sector:sectors(name),
       environment:environments(name),
       equipment_id, equipment:equipment(tag),
       assigned_user_id, assigned:users!tickets_assigned_user_id_fkey(full_name),
       opened_by:users!tickets_opened_by_user_id_fkey(full_name)`,
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getTicketById]", error.message);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: data.status,
    notes: data.notes,
    openedAt: data.opened_at,
    clientId: data.client_id,
    clientName: firstOf(data.client)?.corporate_name ?? "—",
    unitId: data.unit_id,
    unitName: firstOf(data.unit)?.name ?? "—",
    sectorName: firstOf(data.sector)?.name ?? null,
    environmentName: firstOf(data.environment)?.name ?? null,
    equipmentId: data.equipment_id,
    equipmentTag: firstOf(data.equipment)?.tag ?? null,
    assignedUserId: data.assigned_user_id,
    assignedName: firstOf(data.assigned)?.full_name ?? null,
    openedByName: firstOf(data.opened_by)?.full_name ?? "—",
    workOrderId: data.work_order_id,
  };
}

/** Chamados abertos vinculados a um equipamento — seção da página de detalhe. */
export async function listTicketsByEquipment(
  equipmentId: string,
): Promise<TicketListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(LIST_SELECT)
    .eq("equipment_id", equipmentId)
    .order("opened_at", { ascending: false });

  if (error) {
    console.error("[listTicketsByEquipment]", error.message);
    return [];
  }

  return (data ?? []).map(mapListRow);
}

export type TicketTimelineEntry = {
  id: string;
  action: string;
  previousStatus: TicketStatus | null;
  newStatus: TicketStatus | null;
  userName: string | null;
  createdAt: string;
};

/**
 * Timeline via RPC get_ticket_timeline (migration 0015) — não usa audit_logs
 * direto porque a policy de select ali exige view_audit_log, permissão mais
 * ampla do que quem só precisa ver o histórico dos próprios chamados.
 */
export async function getTicketTimeline(
  ticketId: string,
): Promise<TicketTimelineEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_ticket_timeline", {
    p_ticket_id: ticketId,
  });

  if (error) {
    console.error("[getTicketTimeline]", error.message);
    return [];
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];

  const namesByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", userIds);
    for (const u of users ?? []) namesByUserId.set(u.id, u.full_name);
  }

  return rows.map((row) => {
    const previous = row.previous_data as { status?: TicketStatus } | null;
    const next = row.new_data as { status?: TicketStatus } | null;
    return {
      id: row.id,
      action: row.action,
      previousStatus: previous?.status ?? null,
      newStatus: next?.status ?? null,
      userName: row.user_id ? (namesByUserId.get(row.user_id) ?? "—") : null,
      createdAt: row.created_at,
    };
  });
}

/** Chamados urgentes ainda em aberto — card do dashboard. */
export async function countUrgentOpenTickets(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("priority", "urgente")
    .not("status", "in", `(${TICKET_CLOSED_STATUSES.join(",")})`);

  if (error) {
    console.error("[countUrgentOpenTickets]", error.message);
    return 0;
  }

  return count ?? 0;
}
