"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission, hasPermission } from "@/lib/auth/permissions";
import {
  generateFromPreventivePlanSchema,
  generateFromTicketSchema,
  type WorkOrderStatus,
} from "@/features/work-orders/schema";

export type WorkOrderFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function none(value: FormDataEntryValue | null) {
  return value && value !== "none" ? String(value) : undefined;
}

function revalidateWorkOrders(workOrderId?: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/preventivas");
  revalidatePath("/chamados");
  revalidatePath("/minhas-atividades");
  revalidatePath("/dashboard");
  if (workOrderId) revalidatePath(`/ordens-servico/${workOrderId}`);
}

/**
 * Gera uma OS corretiva a partir de um chamado + cria um maintenance_record
 * por equipamento selecionado, e liga o chamado de volta à OS
 * (tickets.work_order_id). Requer manage_work_orders.
 */
export async function generateWorkOrderFromTicket(
  ticketId: string,
  _prevState: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireUser();
  await assertPermission("manage_work_orders");

  const parsed = generateFromTicketSchema.safeParse({
    title: formData.get("title"),
    equipmentIds: formData.getAll("equipmentIds"),
    scheduledDate: formData.get("scheduledDate") || undefined,
    assignedUserId: none(formData.get("assignedUserId")),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("client_id, unit_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return { error: "Chamado não encontrado." };
  }

  const { data: workOrder, error: woError } = await supabase
    .from("work_orders")
    .insert({
      company_id: user.companyId,
      client_id: ticket.client_id,
      unit_id: ticket.unit_id,
      type: "corretiva",
      origin_ticket_id: ticketId,
      title: parsed.data.title,
      scheduled_date: parsed.data.scheduledDate || null,
      assigned_user_id: parsed.data.assignedUserId ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (woError || !workOrder) {
    return { error: `Não foi possível gerar a OS: ${woError?.message}` };
  }

  const { error: mrError } = await supabase.from("maintenance_records").insert(
    parsed.data.equipmentIds.map((equipmentId) => ({
      company_id: user.companyId,
      work_order_id: workOrder.id,
      equipment_id: equipmentId,
    })),
  );

  if (mrError) {
    return { error: `OS criada, mas falhou ao vincular equipamentos: ${mrError.message}` };
  }

  await supabase.from("tickets").update({ work_order_id: workOrder.id }).eq("id", ticketId);

  revalidateWorkOrders(workOrder.id);
  revalidatePath(`/chamados/${ticketId}`);
  return { success: true };
}

/**
 * Gera uma OS preventiva a partir de um plano — equipamentos vêm de
 * preventive_plan_equipment, não são escolhidos na hora. Requer
 * manage_work_orders.
 */
export async function generateWorkOrderFromPreventivePlan(
  planId: string,
  _prevState: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireUser();
  await assertPermission("manage_work_orders");

  const parsed = generateFromPreventivePlanSchema.safeParse({
    title: formData.get("title"),
    scheduledDate: formData.get("scheduledDate") || undefined,
    assignedUserId: none(formData.get("assignedUserId")),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();

  const [{ data: plan, error: planError }, { data: planEquipment }] = await Promise.all([
    supabase
      .from("preventive_plans")
      .select("client_id, unit_id")
      .eq("id", planId)
      .maybeSingle(),
    supabase
      .from("preventive_plan_equipment")
      .select("equipment_id")
      .eq("preventive_plan_id", planId),
  ]);

  if (planError || !plan) {
    return { error: "Plano preventivo não encontrado." };
  }
  if (!planEquipment || planEquipment.length === 0) {
    return { error: "Este plano não tem equipamentos vinculados — edite o plano antes de gerar a OS." };
  }

  const { data: workOrder, error: woError } = await supabase
    .from("work_orders")
    .insert({
      company_id: user.companyId,
      client_id: plan.client_id,
      unit_id: plan.unit_id,
      type: "preventiva",
      origin_preventive_plan_id: planId,
      title: parsed.data.title,
      scheduled_date: parsed.data.scheduledDate || null,
      assigned_user_id: parsed.data.assignedUserId ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (woError || !workOrder) {
    return { error: `Não foi possível gerar a OS: ${woError?.message}` };
  }

  const { error: mrError } = await supabase.from("maintenance_records").insert(
    planEquipment.map((pe) => ({
      company_id: user.companyId,
      work_order_id: workOrder.id,
      equipment_id: pe.equipment_id,
    })),
  );

  if (mrError) {
    return { error: `OS criada, mas falhou ao vincular equipamentos: ${mrError.message}` };
  }

  revalidateWorkOrders(workOrder.id);
  return { success: true };
}

/** Atribui (ou remove) o técnico responsável pela OS. Requer manage_work_orders. */
export async function assignWorkOrder(
  workOrderId: string,
  assignedUserId: string | null,
): Promise<void> {
  await requireUser();
  await assertPermission("manage_work_orders");

  const supabase = await createSupabaseClient();
  await supabase
    .from("work_orders")
    .update({ assigned_user_id: assignedUserId })
    .eq("id", workOrderId);

  revalidateWorkOrders(workOrderId);
}

/**
 * Muda o status da OS. Aceita manage_work_orders (despachante reagenda/
 * cancela) OU execute_work_order (técnico avança em_andamento/concluída) —
 * mesma dupla-permissão da RLS (0021_rls_fase4a.sql). Marca
 * started_at/finished_at automaticamente nas transições relevantes.
 */
export async function setWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus,
): Promise<void> {
  await requireUser();

  const [canManage, canExecute] = await Promise.all([
    hasPermission("manage_work_orders"),
    hasPermission("execute_work_order"),
  ]);
  if (!canManage && !canExecute) {
    throw new Error("Permissão negada: manage_work_orders ou execute_work_order");
  }

  const patch: { status: WorkOrderStatus; started_at?: string; finished_at?: string } = {
    status,
  };
  if (status === "em_andamento") patch.started_at = new Date().toISOString();
  if (status === "concluida" || status === "cancelada") {
    patch.finished_at = new Date().toISOString();
  }

  const supabase = await createSupabaseClient();
  await supabase.from("work_orders").update(patch).eq("id", workOrderId);

  revalidateWorkOrders(workOrderId);
}
