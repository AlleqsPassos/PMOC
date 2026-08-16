"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  checklistTemplateItemSchema,
  checklistTemplateSchema,
} from "@/features/checklist-templates/schema";

export type ChecklistTemplateFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function revalidateTemplates(templateId?: string) {
  revalidatePath("/configuracoes/checklist-templates");
  if (templateId) revalidatePath(`/configuracoes/checklist-templates/${templateId}`);
}

function parseTemplateForm(formData: FormData) {
  return checklistTemplateSchema.safeParse({
    name: formData.get("name"),
    maintenanceType: formData.get("maintenanceType"),
    equipmentType: formData.get("equipmentType") || undefined,
  });
}

/** Cria um template de checklist. Requer manage_checklist_templates. */
export async function createChecklistTemplate(
  _prevState: ChecklistTemplateFormState,
  formData: FormData,
): Promise<ChecklistTemplateFormState> {
  const user = await requireUser();
  await assertPermission("manage_checklist_templates");

  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("checklist_templates").insert({
    company_id: user.companyId,
    name: parsed.data.name,
    maintenance_type: parsed.data.maintenanceType,
    equipment_type: parsed.data.equipmentType || null,
  });

  if (error) {
    return { error: `Não foi possível criar o template: ${error.message}` };
  }

  revalidateTemplates();
  return { success: true };
}

/** Edita um template. Requer manage_checklist_templates. */
export async function updateChecklistTemplate(
  templateId: string,
  _prevState: ChecklistTemplateFormState,
  formData: FormData,
): Promise<ChecklistTemplateFormState> {
  await requireUser();
  await assertPermission("manage_checklist_templates");

  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("checklist_templates")
    .update({
      name: parsed.data.name,
      maintenance_type: parsed.data.maintenanceType,
      equipment_type: parsed.data.equipmentType || null,
    })
    .eq("id", templateId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidateTemplates(templateId);
  return { success: true };
}

export type ChecklistItemFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

/**
 * Adiciona um item ao fim do template — sem reordenação sofisticada,
 * order_index é sempre a contagem atual de itens (append-only).
 */
export async function addChecklistTemplateItem(
  templateId: string,
  _prevState: ChecklistItemFormState,
  formData: FormData,
): Promise<ChecklistItemFormState> {
  const user = await requireUser();
  await assertPermission("manage_checklist_templates");

  const parsed = checklistTemplateItemSchema.safeParse({
    label: formData.get("label"),
    isRequired: formData.get("isRequired") === "on",
    allowsOther: formData.get("allowsOther") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { count } = await supabase
    .from("checklist_template_items")
    .select("id", { count: "exact", head: true })
    .eq("checklist_template_id", templateId);

  const { error } = await supabase.from("checklist_template_items").insert({
    company_id: user.companyId,
    checklist_template_id: templateId,
    label: parsed.data.label,
    order_index: count ?? 0,
    is_required: parsed.data.isRequired ?? true,
    allows_other: parsed.data.allowsOther ?? false,
  });

  if (error) {
    return { error: `Não foi possível adicionar o item: ${error.message}` };
  }

  revalidateTemplates(templateId);
  return { success: true };
}

/** Remove um item do template. Requer manage_checklist_templates. */
export async function removeChecklistTemplateItem(
  itemId: string,
  templateId: string,
): Promise<void> {
  await requireUser();
  await assertPermission("manage_checklist_templates");

  const supabase = await createSupabaseClient();
  await supabase.from("checklist_template_items").delete().eq("id", itemId);

  revalidateTemplates(templateId);
}
