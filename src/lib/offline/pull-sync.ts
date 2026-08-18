"use client";

import { createClient } from "@/lib/supabase/client";
import { offlineDb } from "@/lib/offline/db";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Torna visível uma consulta do pull que falhou.
 *
 * Sem isto, o pull descarta o erro em silêncio: `data` vem null, o `bulkPut([])`
 * é inofensivo (não apaga o cache) e a tela segue mostrando o dado antigo com o
 * selo "Sincronizado". Foi exatamente o que aconteceu ao rodar a Fase 10 com o
 * banco ainda sem as colunas novas — o aplicativo parecia em dia e não estava.
 * O aviso no console não conserta o descompasso, mas dá nome a ele em vez de
 * deixar quem investiga procurando no lugar errado.
 */
function reportPullErrors(
  results: { label: string; error: { message: string } | null }[],
): void {
  for (const { label, error } of results) {
    if (error) console.warn(`[pullTechnicianData] ${label}: ${error.message}`);
  }
}

/**
 * Zera o banco local quando o dispositivo troca de usuário.
 *
 * O IndexedDB é por origem, não por sessão: `logout()` derruba só o cookie
 * do Supabase. Sem esta checagem, num tablet compartilhado (o cenário real
 * do hospital) o técnico seguinte via `bulkPut` herdaria as OS e chamados do
 * anterior — o pull filtra por `assigned_user_id`, mas `bulkPut` só mescla,
 * nunca remove o que ficou. Pior: itens de outbox do usuário anterior
 * drenariam sob a sessão do novo, gravando no servidor em nome de quem não
 * fez a edição.
 *
 * Roda antes de qualquer escrita do pull, e o pull só acontece online — logo
 * o outbox do usuário anterior já teve chance de drenar (`drainThenPull`).
 */
export async function resetLocalDbIfUserChanged(): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const previous = await offlineDb.meta.get("userId");
  if (!previous) return;

  const {
    data: { user },
  } = await createClient().auth.getUser();
  // Sem sessão não dá para decidir de quem é o banco — não apaga nada, o
  // dado local do dono continua válido até alguém de fato entrar.
  if (!user || previous.value === user.id) return;

  await offlineDb.transaction("rw", offlineDb.tables, async () => {
    await Promise.all(offlineDb.tables.map((t) => t.clear()));
  });
}

/**
 * Baixa tudo que o técnico logado precisa pra trabalhar offline: as OS
 * atribuídas a ele (+ seus maintenance_records/checklist/medições/
 * peças/anexos-metadados), os chamados dele, e o catálogo de referência da
 * empresa (unidades, setores, ambientes, equipamentos, peças, templates de
 * checklist, tipos de medição — dataset pequeno, empresa única).
 * `bulkPut` por tabela dentro de uma transação —
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
    { data: workOrders, error: workOrdersError },
    { data: templates, error: templatesError },
    { data: templateItems, error: templateItemsError },
    { data: measurementTypes, error: measurementTypesError },
    { data: tickets, error: ticketsError },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        // `users!work_orders_created_by_fkey` explícito: work_orders tem duas
        // FKs para users (created_by e assigned_user_id) e o PostgREST não
        // adivinha qual delas o embed quer.
        "id, title, type, status, scheduled_date, started_at, finished_at, created_at, origin_ticket_id, client_id, unit_id, assigned_user_id, client:clients(corporate_name), unit:units(name), created_by_user:users!work_orders_created_by_fkey(full_name)",
      )
      .eq("assigned_user_id", me.id),
    supabase
      .from("checklist_templates")
      .select("id, name, maintenance_type, equipment_type"),
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
        "id, title, description, priority, status, opened_by_user_id, opened_at, work_order_id, client_id, unit_id, equipment_id, client:clients(corporate_name), unit:units(name), equipment:equipment(tag), opened_by:users!tickets_opened_by_user_id_fkey(full_name)",
      )
      .eq("assigned_user_id", me.id),
  ]);

  reportPullErrors([
    { label: "work_orders", error: workOrdersError },
    { label: "checklist_templates", error: templatesError },
    { label: "checklist_template_items", error: templateItemsError },
    { label: "measurement_types", error: measurementTypesError },
    { label: "tickets", error: ticketsError },
  ]);

  const workOrderIds = (workOrders ?? []).map((w) => w.id);

  const [
    { data: maintenanceRecords, error: recordsError },
    { data: partsRequests, error: partsRequestsError },
    { data: attachments, error: attachmentsError },
    { data: equipment, error: equipmentError },
    { data: environments, error: environmentsError },
    { data: units, error: unitsError },
    { data: sectors, error: sectorsError },
    { data: partsCatalog, error: partsCatalogError },
  ] = await Promise.all([
    workOrderIds.length
      ? supabase
          .from("maintenance_records")
          .select(
            "id, work_order_id, equipment_id, technician_user_id, status, resolution, cause_identified, service_performed, recommendation, diagnosis, notes, started_at, completed_at, updated_at, equipment:equipment(tag), technician:users(full_name)",
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as never[], error: null }),
    workOrderIds.length
      ? supabase
          .from("parts_requests")
          .select(
            "id, work_order_id, maintenance_record_id, part_name, quantity, note, status, created_at, requested_by:users!parts_requests_requested_by_user_id_fkey(full_name)",
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as never[], error: null }),
    workOrderIds.length
      ? supabase
          .from("attachments")
          .select(
            "id, work_order_id, maintenance_record_id, equipment_id, category, file_name, mime_type, size_bytes, storage_path, created_at",
          )
          .in("work_order_id", workOrderIds)
      : Promise.resolve({ data: [] as never[], error: null }),
    // Catálogo da **empresa inteira**, sem filtro de unidade.
    //
    // A Fase 9 tinha restringido isto às unidades com trabalho atribuído, para
    // não guardar no aparelho dado que o técnico não precisava. A Fase 10
    // reverte: ele ganhou menu próprio de Equipamentos justamente para poder
    // passar um dia atualizando cadastro sem OS atribuída, e nesse caso
    // `unitIds` estaria vazio — a tela nasceria vazia. A RLS continua sendo a
    // fronteira real (só a empresa dele), o que muda é quanto do que ele já
    // pode ver fica em cache.
    supabase
      .from("equipment")
      .select(
        "id, tag, type, brand, model, unit_id, environment_id, unit:units(client_id, name, client:clients(corporate_name))",
      )
      .is("deleted_at", null),
    supabase
      .from("environments")
      .select("id, unit_id, sector_id, name")
      .is("deleted_at", null),
    supabase
      .from("units")
      .select("id, client_id, name, client:clients(corporate_name)")
      .is("deleted_at", null),
    supabase.from("sectors").select("id, unit_id, name").is("deleted_at", null),
    supabase
      .from("parts_catalog")
      .select("id, name, unit")
      .eq("is_active", true)
      .order("name"),
  ]);

  reportPullErrors([
    { label: "maintenance_records", error: recordsError },
    { label: "parts_requests", error: partsRequestsError },
    { label: "attachments", error: attachmentsError },
    { label: "equipment", error: equipmentError },
    { label: "environments", error: environmentsError },
    { label: "units", error: unitsError },
    { label: "sectors", error: sectorsError },
    { label: "parts_catalog", error: partsCatalogError },
  ]);

  const recordIds = (maintenanceRecords ?? []).map((r) => r.id);
  const [{ data: checklistItems }, { data: measurements }] = await Promise.all([
    recordIds.length
      ? supabase
          .from("maintenance_record_checklist_items")
          .select("id, maintenance_record_id, template_item_id, label_snapshot, status, note")
          .in("maintenance_record_id", recordIds)
      : Promise.resolve({ data: [] as never[], error: null }),
    recordIds.length
      ? supabase
          .from("measurements")
          .select(
            "id, maintenance_record_id, measurement_type_id, value_numeric, value_text, unit, note, created_at, measurement_type:measurement_types(label)",
          )
          .in("maintenance_record_id", recordIds)
      : Promise.resolve({ data: [] as never[], error: null }),
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
      offlineDb.environments,
      offlineDb.units,
      offlineDb.sectors,
      offlineDb.partsCatalog,
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
          createdByName: firstOf(w.created_by_user)?.full_name ?? null,
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
          resolution: r.resolution,
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
          openedByName: firstOf(t.opened_by)?.full_name ?? null,
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
            brand: e.brand,
            model: e.model,
            unitId: e.unit_id,
            environmentId: e.environment_id,
            unitName: unit?.name ?? "—",
            clientId: unit?.client_id ?? "",
            clientName: client?.corporate_name ?? "—",
          };
        }),
      );

      await offlineDb.environments.bulkPut(
        (environments ?? []).map((e) => ({
          id: e.id,
          unitId: e.unit_id,
          sectorId: e.sector_id,
          name: e.name,
        })),
      );

      await offlineDb.units.bulkPut(
        (units ?? []).map((u) => ({
          id: u.id,
          clientId: u.client_id,
          clientName: firstOf(u.client)?.corporate_name ?? "—",
          name: u.name,
        })),
      );

      await offlineDb.sectors.bulkPut(
        (sectors ?? []).map((s) => ({
          id: s.id,
          unitId: s.unit_id,
          name: s.name,
        })),
      );

      await offlineDb.partsCatalog.bulkPut(
        (partsCatalog ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
        })),
      );

      await offlineDb.checklistTemplates.bulkPut(
        (templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          maintenanceType: t.maintenance_type,
          equipmentType: t.equipment_type,
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
