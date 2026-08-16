"use client";

import { createClient } from "@/lib/supabase/client";
import { offlineDb } from "@/lib/offline/db";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Baixa tudo que o técnico logado precisa pra trabalhar offline: as OS
 * atribuídas a ele (+ seus maintenance_records/checklist/medições/
 * peças/anexos-metadados), os chamados dele, e o catálogo de referência da
 * empresa (equipamentos, templates de checklist, tipos de medição — dataset
 * pequeno, empresa única). `bulkPut` por tabela dentro de uma transação —
 * sobrescreve o que já existia local (servidor é sempre a fonte de verdade
 * pra dado de referência; dado ainda não sincronizado do outbox não é
 * tocado aqui, só as tabelas espelho).
 *
 * Disparado no login, em reconexão (`online`) e manualmente pelo badge de
 * sync — nunca em background sem o usuário saber (ver sync-engine.ts).
 */
export async function pullTechnicianData(): Promise<{ error?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { error: "Sem conexão." };
  }

  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { error: "Sessão não encontrada." };

  const { data: me, error: meError } = await supabase
    .from("users")
    .select("id, company_id, full_name")
    .eq("id", authUser.id)
    .maybeSingle();
  if (meError || !me) return { error: "Não foi possível identificar o usuário." };

  const [
    { data: workOrders },
    { data: equipment },
    { data: templates },
    { data: templateItems },
    { data: measurementTypes },
    { data: tickets },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, title, type, status, scheduled_date, started_at, finished_at, created_at, origin_ticket_id, client_id, unit_id, assigned_user_id, client:clients(corporate_name), unit:units(name)",
      )
      .eq("assigned_user_id", me.id),
    supabase
      .from("equipment")
      .select("id, tag, type, unit_id, unit:units(client_id, name, client:clients(corporate_name))")
      .is("deleted_at", null),
    supabase.from("checklist_templates").select("id, name, maintenance_type"),
    supabase
      .from("checklist_template_items")
      .select("id, checklist_template_id, label, order_index")
      .order("order_index"),
    supabase
      .from("measurement_types")
      .select("id, key, label, unit_default, data_type")
      .eq("is_active", true),
    supabase
      .from("tickets")
      .select(
        "id, title, description, priority, status, opened_by_user_id, opened_at, work_order_id, client_id, unit_id, equipment_id, client:clients(corporate_name), unit:units(name), equipment:equipment(tag)",
      )
      .eq("assigned_user_id", me.id),
  ]);

  const workOrderIds = (workOrders ?? []).map((w) => w.id);

  const [
    { data: maintenanceRecords },
    { data: partsRequests },
    { data: attachments },
  ] = await Promise.all([
    workOrderIds.length
      ? supabase
          .from("maintenance_records")
          .select(
            "id, work_order_id, equipment_id, technician_user_id, status, cause_identified, service_performed, recommendation, diagnosis, notes, started_at, completed_at, updated_at, equipment:equipment(tag), technician:users(full_name)",
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as never[] }),
    workOrderIds.length
      ? supabase
          .from("parts_requests")
          .select(
            "id, work_order_id, maintenance_record_id, part_name, quantity, note, status, created_at, requested_by:users!parts_requests_requested_by_user_id_fkey(full_name)",
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as never[] }),
    workOrderIds.length
      ? supabase
          .from("attachments")
          .select(
            "id, work_order_id, maintenance_record_id, equipment_id, category, file_name, mime_type, size_bytes, storage_path, created_at",
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const recordIds = (maintenanceRecords ?? []).map((r) => r.id);
  const [{ data: checklistItems }, { data: measurements }] = await Promise.all([
    recordIds.length
      ? supabase
          .from("maintenance_record_checklist_items")
          .select("id, maintenance_record_id, template_item_id, label_snapshot, status, note")
          .in("maintenance_record_id", recordIds)
      : Promise.resolve({ data: [] as never[] }),
    recordIds.length
      ? supabase
          .from("measurements")
          .select(
            "id, maintenance_record_id, measurement_type_id, value_numeric, value_text, unit, note, created_at, measurement_type:measurement_types(label)",
          )
          .in("maintenance_record_id", recordIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  await offlineDb.transaction(
    "rw",
    [
      offlineDb.workOrders,
      offlineDb.maintenanceRecords,
      offlineDb.checklistItems,
      offlineDb.measurements,
      offlineDb.partsRequests,
      offlineDb.attachments,
      offlineDb.tickets,
      offlineDb.equipment,
      offlineDb.checklistTemplates,
      offlineDb.checklistTemplateItems,
      offlineDb.measurementTypes,
      offlineDb.meta,
    ],
    async () => {
      await offlineDb.workOrders.bulkPut(
        (workOrders ?? []).map((w) => ({
          id: w.id,
          title: w.title,
          type: w.type,
          status: w.status,
          clientId: w.client_id,
          clientName: firstOf(w.client)?.corporate_name ?? "—",
          unitId: w.unit_id,
          unitName: firstOf(w.unit)?.name ?? "—",
          assignedUserId: w.assigned_user_id,
          scheduledDate: w.scheduled_date,
          startedAt: w.started_at,
          finishedAt: w.finished_at,
          originTicketId: w.origin_ticket_id,
          createdAt: w.created_at,
        })),
      );

      await offlineDb.maintenanceRecords.bulkPut(
        (maintenanceRecords ?? []).map((r) => ({
          id: r.id,
          workOrderId: r.work_order_id,
          equipmentId: r.equipment_id,
          equipmentTag: firstOf(r.equipment)?.tag ?? "—",
          technicianUserId: r.technician_user_id,
          technicianName: firstOf(r.technician)?.full_name ?? null,
          status: r.status,
          causeIdentified: r.cause_identified,
          servicePerformed: r.service_performed,
          recommendation: r.recommendation,
          diagnosis: r.diagnosis,
          notes: r.notes,
          startedAt: r.started_at,
          completedAt: r.completed_at,
          updatedAt: r.updated_at,
        })),
      );

      await offlineDb.checklistItems.bulkPut(
        (checklistItems ?? []).map((c) => ({
          id: c.id,
          maintenanceRecordId: c.maintenance_record_id,
          templateItemId: c.template_item_id,
          labelSnapshot: c.label_snapshot,
          status: c.status,
          note: c.note,
        })),
      );

      await offlineDb.measurements.bulkPut(
        (measurements ?? []).map((m) => ({
          id: m.id,
          maintenanceRecordId: m.maintenance_record_id,
          measurementTypeId: m.measurement_type_id,
          typeLabel: firstOf(m.measurement_type)?.label ?? "—",
          valueNumeric: m.value_numeric,
          valueText: m.value_text,
          unit: m.unit,
          note: m.note,
          createdAt: m.created_at,
        })),
      );

      await offlineDb.partsRequests.bulkPut(
        (partsRequests ?? []).map((p) => ({
          id: p.id,
          workOrderId: p.work_order_id,
          maintenanceRecordId: p.maintenance_record_id,
          partName: p.part_name,
          quantity: p.quantity,
          note: p.note,
          status: p.status,
          requestedByName: firstOf(p.requested_by)?.full_name ?? "—",
          createdAt: p.created_at,
        })),
      );

      await offlineDb.attachments.bulkPut(
        (attachments ?? []).map((a) => ({
          id: a.id,
          workOrderId: a.work_order_id,
          maintenanceRecordId: a.maintenance_record_id,
          equipmentId: a.equipment_id,
          category: a.category,
          fileName: a.file_name,
          mimeType: a.mime_type,
          sizeBytes: a.size_bytes,
          storagePath: a.storage_path,
          createdAt: a.created_at,
        })),
      );

      await offlineDb.tickets.bulkPut(
        (tickets ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          clientId: t.client_id,
          clientName: firstOf(t.client)?.corporate_name ?? "—",
          unitId: t.unit_id,
          unitName: firstOf(t.unit)?.name ?? "—",
          equipmentId: t.equipment_id,
          equipmentTag: firstOf(t.equipment)?.tag ?? null,
          openedByUserId: t.opened_by_user_id,
          openedAt: t.opened_at,
          workOrderId: t.work_order_id,
        })),
      );

      await offlineDb.equipment.bulkPut(
        (equipment ?? []).map((e) => {
          const unit = firstOf(e.unit);
          const client = unit ? firstOf(unit.client) : null;
          return {
            id: e.id,
            tag: e.tag,
            type: e.type,
            unitId: e.unit_id,
            unitName: unit?.name ?? "—",
            clientId: unit?.client_id ?? "",
            clientName: client?.corporate_name ?? "—",
          };
        }),
      );

      await offlineDb.checklistTemplates.bulkPut(
        (templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          maintenanceType: t.maintenance_type,
        })),
      );

      await offlineDb.checklistTemplateItems.bulkPut(
        (templateItems ?? []).map((i) => ({
          id: i.id,
          checklistTemplateId: i.checklist_template_id,
          label: i.label,
          orderIndex: i.order_index,
        })),
      );

      await offlineDb.measurementTypes.bulkPut(
        (measurementTypes ?? []).map((m) => ({
          id: m.id,
          key: m.key,
          label: m.label,
          unitDefault: m.unit_default,
          dataType: m.data_type,
        })),
      );

      await offlineDb.meta.bulkPut([
        { key: "lastPulledAt", value: new Date().toISOString() },
        { key: "companyId", value: me.company_id },
        { key: "userId", value: me.id },
        { key: "userFullName", value: me.full_name },
      ]);
    },
  );

  return {};
}
