"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  adhocChecklistItemSchema,
  maintenanceNarrativeSchema,
  measurementSchema,
  type ChecklistItemStatus,
} from "@/features/maintenance/schema";

export type MaintenanceFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

/** Execução é coberta por execute_work_order OU manage_work_orders — mesma dupla-permissão de 0021/0029. */
async function assertCanExecute(user: CurrentUser): Promise<void> {
  const [canExecute, canManage] = await Promise.all([
    hasPermission("execute_work_order"),
    hasPermission("manage_work_orders"),
  ]);
  if (!canExecute && !canManage) {
    throw new Error("Permissão negada: execute_work_order ou manage_work_orders");
  }
  void user;
}

function revalidateRecord(workOrderId: string, recordId: string) {
  revalidatePath(`/ordens-servico/${workOrderId}`);
  revalidatePath(`/ordens-servico/${workOrderId}/atender/${recordId}`);
}

/** Marca o início do atendimento — botão explícito, sem inferir de outra ação. */
export async function startMaintenanceRecord(
  recordId: string,
  workOrderId: string,
): Promise<void> {
  const user = await requireUser();
  await assertCanExecute(user);

  const supabase = await createSupabaseClient();
  await supabase
    .from("maintenance_records")
    .update({ started_at: new Date().toISOString(), technician_user_id: user.id })
    .eq("id", recordId)
    .is("started_at", null);

  revalidateRecord(workOrderId, recordId);
}

/**
 * Aplica um template ao checklist do registro — copia os itens como
 * label_snapshot (preserva o texto mesmo se o template mudar depois).
 * Bloqueia se já houver itens (evita duplicar ao reaplicar por engano).
 */
export async function applyChecklistTemplate(
  recordId: string,
  workOrderId: string,
  templateId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  await assertCanExecute(user);

  const supabase = await createSupabaseClient();

  const { count } = await supabase
    .from("maintenance_record_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("maintenance_record_id", recordId);

  if (count && count > 0) {
    return { error: "Este atendimento já tem itens de checklist." };
  }

  const { data: templateItems, error: templateError } = await supabase
    .from("checklist_template_items")
    .select("id, label")
    .eq("checklist_template_id", templateId)
    .order("order_index");

  if (templateError || !templateItems || templateItems.length === 0) {
    return { error: "Template sem itens ou não encontrado." };
  }

  const { error } = await supabase.from("maintenance_record_checklist_items").insert(
    templateItems.map((item) => ({
      company_id: user.companyId,
      maintenance_record_id: recordId,
      template_item_id: item.id,
      label_snapshot: item.label,
    })),
  );

  if (error) {
    return { error: `Não foi possível aplicar o template: ${error.message}` };
  }

  revalidateRecord(workOrderId, recordId);
  return {};
}

/** Item "outro" — achado ad-hoc, sem vínculo com template. */
export async function addAdhocChecklistItem(
  recordId: string,
  workOrderId: string,
  _prevState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const user = await requireUser();
  await assertCanExecute(user);

  const parsed = adhocChecklistItemSchema.safeParse({ label: formData.get("label") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("maintenance_record_checklist_items").insert({
    company_id: user.companyId,
    maintenance_record_id: recordId,
    template_item_id: null,
    label_snapshot: parsed.data.label,
  });

  if (error) {
    return { error: `Não foi possível adicionar: ${error.message}` };
  }

  revalidateRecord(workOrderId, recordId);
  return { success: true };
}

/** Salvamento incremental — muda status/nota de um item por vez. */
export async function updateChecklistItemStatus(
  itemId: string,
  workOrderId: string,
  recordId: string,
  status: ChecklistItemStatus,
): Promise<void> {
  const user = await requireUser();
  await assertCanExecute(user);

  const supabase = await createSupabaseClient();
  await supabase.from("maintenance_record_checklist_items").update({ status }).eq("id", itemId);

  revalidateRecord(workOrderId, recordId);
}

/** Medição — aditiva, nunca editada (sem policy de update no banco). */
export async function addMeasurement(
  recordId: string,
  workOrderId: string,
  _prevState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const user = await requireUser();
  await assertCanExecute(user);

  const parsed = measurementSchema.safeParse({
    measurementTypeId: formData.get("measurementTypeId"),
    valueNumeric: formData.get("valueNumeric") || undefined,
    valueText: formData.get("valueText") || undefined,
    unit: formData.get("unit") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const numeric = parsed.data.valueNumeric ? Number(parsed.data.valueNumeric) : null;
  if (parsed.data.valueNumeric && Number.isNaN(numeric)) {
    return { fieldErrors: { valueNumeric: ["Valor numérico inválido."] } };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("measurements").insert({
    company_id: user.companyId,
    maintenance_record_id: recordId,
    measurement_type_id: parsed.data.measurementTypeId,
    value_numeric: numeric,
    value_text: parsed.data.valueText || null,
    unit: parsed.data.unit || null,
    note: parsed.data.note || null,
    created_by: user.id,
  });

  if (error) {
    return { error: `Não foi possível registrar a medição: ${error.message}` };
  }

  revalidateRecord(workOrderId, recordId);
  return { success: true };
}

/** Laudo — campos narrativos, salvos incrementalmente (não é um form gigante único). */
export async function updateMaintenanceNarrative(
  recordId: string,
  workOrderId: string,
  _prevState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const user = await requireUser();
  await assertCanExecute(user);

  const parsed = maintenanceNarrativeSchema.safeParse({
    causeIdentified: formData.get("causeIdentified") || undefined,
    servicePerformed: formData.get("servicePerformed") || undefined,
    recommendation: formData.get("recommendation") || undefined,
    diagnosis: formData.get("diagnosis") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("maintenance_records")
    .update({
      cause_identified: parsed.data.causeIdentified || null,
      service_performed: parsed.data.servicePerformed || null,
      recommendation: parsed.data.recommendation || null,
      diagnosis: parsed.data.diagnosis || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", recordId);

  if (error) {
    return { error: `Não foi possível salvar o laudo: ${error.message}` };
  }

  revalidateRecord(workOrderId, recordId);
  return { success: true };
}

/** Fecha o atendimento deste equipamento — não fecha a OS inteira (isso é uma ação separada, manual). */
export async function completeMaintenanceRecord(
  recordId: string,
  workOrderId: string,
): Promise<void> {
  const user = await requireUser();
  await assertCanExecute(user);

  const supabase = await createSupabaseClient();
  await supabase
    .from("maintenance_records")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", recordId);

  revalidatePath(`/equipamentos`);
  revalidateRecord(workOrderId, recordId);
}
