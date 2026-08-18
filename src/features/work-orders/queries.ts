import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/today-date";
import type { WorkOrderStatus, WorkOrderType } from "@/features/work-orders/schema";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const LIST_SELECT =
  "id, title, type, status, scheduled_date, created_at, assigned_user_id, origin_preventive_plan_id, client:clients(corporate_name), unit:units(name), assigned:users!work_orders_assigned_user_id_fkey(full_name)";

export type WorkOrderListItem = {
  id: string;
  title: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  scheduledDate: string | null;
  createdAt: string;
  clientName: string;
  unitName: string;
  assignedUserId: string | null;
  assignedName: string | null;
  originPreventivePlanId: string | null;
};

function mapListRow(row: {
  id: string;
  title: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  scheduled_date: string | null;
  created_at: string;
  assigned_user_id: string | null;
  origin_preventive_plan_id: string | null;
  client: { corporate_name: string } | { corporate_name: string }[] | null;
  unit: { name: string } | { name: string }[] | null;
  assigned: { full_name: string } | { full_name: string }[] | null;
}): WorkOrderListItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    scheduledDate: row.scheduled_date,
    createdAt: row.created_at,
    clientName: firstOf(row.client)?.corporate_name ?? "—",
    unitName: firstOf(row.unit)?.name ?? "—",
    assignedUserId: row.assigned_user_id,
    assignedName: firstOf(row.assigned)?.full_name ?? null,
    originPreventivePlanId: row.origin_preventive_plan_id,
  };
}

type WorkOrderFilters = {
  status?: WorkOrderStatus;
  type?: WorkOrderType;
  clientId?: string;
  unitId?: string;
  originPreventivePlanId?: string;
};

export async function listWorkOrders(
  filters: WorkOrderFilters = {},
): Promise<WorkOrderListItem[]> {
  const supabase = await createClient();

  let query = supabase.from("work_orders").select(LIST_SELECT).order("created_at", {
    ascending: false,
  });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.unitId) query = query.eq("unit_id", filters.unitId);
  if (filters.originPreventivePlanId) {
    query = query.eq("origin_preventive_plan_id", filters.originPreventivePlanId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listWorkOrders]", error.message);
    return [];
  }

  return (data ?? []).map(mapListRow);
}

export type MaintenanceRecordSummary = {
  id: string;
  equipmentId: string;
  equipmentTag: string;
  status: "draft" | "completed";
  /** Fase 12 — desfecho do técnico; `aguardando_peca` é o que o admin precisa liberar. */
  resolution: "resolvido" | "aguardando_peca" | null;
  technicianName: string | null;
};

export type WorkOrderDetail = {
  id: string;
  title: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  clientId: string;
  clientName: string;
  unitId: string;
  unitName: string;
  assignedUserId: string | null;
  assignedName: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  originTicketId: string | null;
  originPreventivePlanId: string | null;
  createdAt: string;
  maintenanceRecords: MaintenanceRecordSummary[];
};

export async function getWorkOrderDetail(workOrderId: string): Promise<WorkOrderDetail | null> {
  const supabase = await createClient();

  const [{ data, error }, { data: records }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        `id, title, type, status, scheduled_date, started_at, finished_at, created_at,
         client_id, client:clients(corporate_name),
         unit_id, unit:units(name),
         assigned_user_id, assigned:users!work_orders_assigned_user_id_fkey(full_name),
         origin_ticket_id, origin_preventive_plan_id`,
      )
      .eq("id", workOrderId)
      .maybeSingle(),
    supabase
      .from("maintenance_records")
      .select(
        "id, equipment_id, status, resolution, technician_user_id, equipment:equipment(tag), technician:users(full_name)",
      )
      .eq("work_order_id", workOrderId)
      .order("created_at"),
  ]);

  if (error || !data) {
    if (error) console.error("[getWorkOrderDetail]", error.message);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    status: data.status,
    clientId: data.client_id,
    clientName: firstOf(data.client)?.corporate_name ?? "—",
    unitId: data.unit_id,
    unitName: firstOf(data.unit)?.name ?? "—",
    assignedUserId: data.assigned_user_id,
    assignedName: firstOf(data.assigned)?.full_name ?? null,
    scheduledDate: data.scheduled_date,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    originTicketId: data.origin_ticket_id,
    originPreventivePlanId: data.origin_preventive_plan_id,
    createdAt: data.created_at,
    maintenanceRecords: (records ?? []).map((r) => ({
      id: r.id,
      equipmentId: r.equipment_id,
      equipmentTag: firstOf(r.equipment)?.tag ?? "—",
      status: r.status,
      resolution: r.resolution,
      technicianName: firstOf(r.technician)?.full_name ?? null,
    })),
  };
}

/** OS ainda não concluídas/canceladas com scheduled_date no passado — card "OS atrasadas" do dashboard. */
export async function countOverdueWorkOrders(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["aberta", "em_andamento"])
    .lt("scheduled_date", getTodayDateString());

  if (error) {
    console.error("[countOverdueWorkOrders]", error.message);
    return 0;
  }

  return count ?? 0;
}
