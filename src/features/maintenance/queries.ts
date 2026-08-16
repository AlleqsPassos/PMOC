import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItemStatus } from "@/features/maintenance/schema";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type MeasurementTypeOption = {
  id: string;
  key: string;
  label: string;
  unitDefault: string | null;
  dataType: "numeric" | "text";
};

/** Global (company_id null) + específicos da empresa, só ativos. */
export async function listMeasurementTypes(): Promise<MeasurementTypeOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("measurement_types")
    .select("id, key, label, unit_default, data_type")
    .eq("is_active", true)
    .order("label");

  if (error) {
    console.error("[listMeasurementTypes]", error.message);
    return [];
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    key: t.key,
    label: t.label,
    unitDefault: t.unit_default,
    dataType: t.data_type,
  }));
}

export type ChecklistItemRow = {
  id: string;
  labelSnapshot: string;
  status: ChecklistItemStatus;
  note: string | null;
  isAdhoc: boolean;
};

export type MeasurementRow = {
  id: string;
  typeLabel: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  note: string | null;
  createdAt: string;
};

export type MaintenanceRecordDetail = {
  id: string;
  workOrderId: string;
  workOrderTitle: string;
  workOrderType: "corretiva" | "preventiva";
  status: "draft" | "completed";
  equipmentId: string;
  equipmentTag: string;
  technicianUserId: string | null;
  technicianName: string | null;
  causeIdentified: string | null;
  servicePerformed: string | null;
  recommendation: string | null;
  diagnosis: string | null;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  checklistItems: ChecklistItemRow[];
  measurements: MeasurementRow[];
};

export type MaintenanceHistoryItem = {
  id: string;
  workOrderId: string;
  workOrderTitle: string;
  workOrderType: "corretiva" | "preventiva";
  technicianName: string | null;
  diagnosis: string | null;
  completedAt: string | null;
};

/** Histórico de manutenção de um equipamento — só registros concluídos. */
export async function listMaintenanceRecordsByEquipment(
  equipmentId: string,
): Promise<MaintenanceHistoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_records")
    .select(
      "id, diagnosis, completed_at, work_order_id, work_order:work_orders(title, type), technician:users(full_name)",
    )
    .eq("equipment_id", equipmentId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[listMaintenanceRecordsByEquipment]", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    const workOrder = firstOf(r.work_order);
    const technician = firstOf(r.technician);
    return {
      id: r.id,
      workOrderId: r.work_order_id,
      workOrderTitle: workOrder?.title ?? "—",
      workOrderType: workOrder?.type ?? "corretiva",
      technicianName: technician?.full_name ?? null,
      diagnosis: r.diagnosis,
      completedAt: r.completed_at,
    };
  });
}

export type MyMaintenanceRecordItem = {
  id: string;
  workOrderId: string;
  workOrderTitle: string;
  workOrderType: "corretiva" | "preventiva";
  equipmentTag: string;
  clientName: string;
  unitName: string;
};

/**
 * "Minhas atividades" do técnico: registros ainda em draft cuja OS está
 * atribuída a ele — mesmo antes de clicar em "Iniciar atendimento" (que só
 * marca technician_user_id/started_at neste registro específico).
 */
export async function listMyMaintenanceRecords(
  userId: string,
): Promise<MyMaintenanceRecordItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_records")
    .select(
      `id, status, work_order_id,
       work_order:work_orders!inner(title, type, assigned_user_id, client:clients(corporate_name), unit:units(name)),
       equipment:equipment(tag)`,
    )
    .eq("status", "draft")
    .eq("work_order.assigned_user_id", userId)
    .order("created_at");

  if (error) {
    console.error("[listMyMaintenanceRecords]", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    const workOrder = firstOf(r.work_order);
    const client = workOrder ? firstOf(workOrder.client) : null;
    const unit = workOrder ? firstOf(workOrder.unit) : null;
    return {
      id: r.id,
      workOrderId: r.work_order_id,
      workOrderTitle: workOrder?.title ?? "—",
      workOrderType: workOrder?.type ?? "corretiva",
      equipmentTag: firstOf(r.equipment)?.tag ?? "—",
      clientName: client?.corporate_name ?? "—",
      unitName: unit?.name ?? "—",
    };
  });
}

export async function getMaintenanceRecordDetail(
  recordId: string,
): Promise<MaintenanceRecordDetail | null> {
  const supabase = await createClient();

  const [{ data, error }, { data: checklistItems }, { data: measurements }] = await Promise.all([
    supabase
      .from("maintenance_records")
      .select(
        `id, status, cause_identified, service_performed, recommendation, diagnosis, notes,
         started_at, completed_at,
         work_order_id, work_order:work_orders(title, type),
         equipment_id, equipment:equipment(tag),
         technician_user_id, technician:users(full_name)`,
      )
      .eq("id", recordId)
      .maybeSingle(),
    supabase
      .from("maintenance_record_checklist_items")
      .select("id, label_snapshot, status, note, template_item_id")
      .eq("maintenance_record_id", recordId)
      .order("created_at"),
    supabase
      .from("measurements")
      .select("id, value_numeric, value_text, unit, note, created_at, measurement_type:measurement_types(label)")
      .eq("maintenance_record_id", recordId)
      .order("created_at"),
  ]);

  if (error || !data) {
    if (error) console.error("[getMaintenanceRecordDetail]", error.message);
    return null;
  }

  const workOrder = firstOf(data.work_order);
  const equipment = firstOf(data.equipment);
  const technician = firstOf(data.technician);

  return {
    id: data.id,
    workOrderId: data.work_order_id,
    workOrderTitle: workOrder?.title ?? "—",
    workOrderType: workOrder?.type ?? "corretiva",
    status: data.status,
    equipmentId: data.equipment_id,
    equipmentTag: equipment?.tag ?? "—",
    technicianUserId: data.technician_user_id,
    technicianName: technician?.full_name ?? null,
    causeIdentified: data.cause_identified,
    servicePerformed: data.service_performed,
    recommendation: data.recommendation,
    diagnosis: data.diagnosis,
    notes: data.notes,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    checklistItems: (checklistItems ?? []).map((c) => ({
      id: c.id,
      labelSnapshot: c.label_snapshot,
      status: c.status,
      note: c.note,
      isAdhoc: c.template_item_id === null,
    })),
    measurements: (measurements ?? []).map((m) => ({
      id: m.id,
      typeLabel: firstOf(m.measurement_type)?.label ?? "—",
      valueNumeric: m.value_numeric,
      valueText: m.value_text,
      unit: m.unit,
      note: m.note,
      createdAt: m.created_at,
    })),
  };
}
