"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { preventivePlanSchema } from "@/features/preventive-plans/schema";

export type PreventivePlanFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function none(value: FormDataEntryValue | null) {
  return value && value !== "none" ? String(value) : undefined;
}

function parsePlanForm(formData: FormData) {
  return preventivePlanSchema.safeParse({
    clientId: formData.get("clientId"),
    unitId: formData.get("unitId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    periodicity: formData.get("periodicity"),
    assignedUserId: none(formData.get("assignedUserId")),
    notes: formData.get("notes") || undefined,
    equipmentIds: formData.getAll("equipmentIds"),
  });
}

function revalidatePlans(planId?: string) {
  revalidatePath("/preventivas");
  revalidatePath("/dashboard");
  if (planId) revalidatePath(`/preventivas/${planId}`);
}

/** Cria um plano preventivo + os vínculos de equipamento. Requer manage_preventive_plans. */
export async function createPreventivePlan(
  _prevState: PreventivePlanFormState,
  formData: FormData,
): Promise<PreventivePlanFormState> {
  const user = await requireUser();
  await assertPermission("manage_preventive_plans");

  const parsed = parsePlanForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { data: plan, error } = await supabase
    .from("preventive_plans")
    .insert({
      company_id: user.companyId,
      client_id: parsed.data.clientId,
      unit_id: parsed.data.unitId,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      periodicity: parsed.data.periodicity,
      assigned_user_id: parsed.data.assignedUserId ?? null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !plan) {
    return { error: `Não foi possível criar o plano: ${error?.message}` };
  }

  const { error: linkError } = await supabase.from("preventive_plan_equipment").insert(
    parsed.data.equipmentIds.map((equipmentId) => ({
      company_id: user.companyId,
      preventive_plan_id: plan.id,
      equipment_id: equipmentId,
    })),
  );

  if (linkError) {
    return { error: `Plano criado, mas falhou ao vincular equipamentos: ${linkError.message}` };
  }

  revalidatePlans();
  return { success: true };
}

/**
 * Edita um plano existente. O conjunto de equipamentos é sempre substituído
 * por inteiro (delete + insert) — mais simples que calcular diff, e o
 * volume por plano é pequeno.
 */
export async function updatePreventivePlan(
  planId: string,
  _prevState: PreventivePlanFormState,
  formData: FormData,
): Promise<PreventivePlanFormState> {
  const user = await requireUser();
  await assertPermission("manage_preventive_plans");

  const parsed = parsePlanForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("preventive_plans")
    .update({
      client_id: parsed.data.clientId,
      unit_id: parsed.data.unitId,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      periodicity: parsed.data.periodicity,
      assigned_user_id: parsed.data.assignedUserId ?? null,
      notes: parsed.data.notes || null,
    })
    .eq("id", planId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  await supabase.from("preventive_plan_equipment").delete().eq("preventive_plan_id", planId);
  const { error: linkError } = await supabase.from("preventive_plan_equipment").insert(
    parsed.data.equipmentIds.map((equipmentId) => ({
      company_id: user.companyId,
      preventive_plan_id: planId,
      equipment_id: equipmentId,
    })),
  );

  if (linkError) {
    return { error: `Salvo, mas falhou ao atualizar equipamentos: ${linkError.message}` };
  }

  revalidatePlans(planId);
  return { success: true };
}

/** Ativa/inativa um plano. Sem deleted_at nesta tabela por design, mesmo padrão de clients. */
export async function setPreventivePlanStatus(
  planId: string,
  status: "active" | "inactive",
): Promise<void> {
  await requireUser();
  await assertPermission("manage_preventive_plans");

  const supabase = await createSupabaseClient();
  await supabase.from("preventive_plans").update({ status }).eq("id", planId);

  revalidatePlans(planId);
}
