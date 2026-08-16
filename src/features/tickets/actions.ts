"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { ticketQuickSchema, ticketSchema, type TicketStatus } from "@/features/tickets/schema";

export type TicketFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function none(value: FormDataEntryValue | null) {
  return value && value !== "none" ? String(value) : undefined;
}

function parseTicketForm(formData: FormData) {
  return ticketSchema.safeParse({
    clientId: formData.get("clientId"),
    unitId: formData.get("unitId"),
    sectorId: none(formData.get("sectorId")),
    environmentId: none(formData.get("environmentId")),
    equipmentId: none(formData.get("equipmentId")),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || undefined,
  });
}

/** Também usado por updateTicket — mesmo shape do form de edição (sem localização). */
function parseQuickForm(formData: FormData) {
  return ticketQuickSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || undefined,
  });
}

function revalidateTicket(ticketId?: string) {
  revalidatePath("/chamados");
  revalidatePath("/minhas-atividades");
  revalidatePath("/dashboard");
  if (ticketId) revalidatePath(`/chamados/${ticketId}`);
}

/** Criação pelo admin/despachante — a partir do contato do cliente. Requer create_tickets. */
export async function createTicket(
  _prevState: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await requireUser();
  await assertPermission("create_tickets");

  const parsed = parseTicketForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("tickets").insert({
    company_id: user.companyId,
    client_id: parsed.data.clientId,
    unit_id: parsed.data.unitId,
    sector_id: parsed.data.sectorId ?? null,
    environment_id: parsed.data.environmentId ?? null,
    equipment_id: parsed.data.equipmentId ?? null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    priority: parsed.data.priority,
    opened_by_user_id: user.id,
  });

  if (error) {
    return { error: `Não foi possível abrir o chamado: ${error.message}` };
  }

  revalidateTicket();
  return { success: true };
}

// Criação ad-hoc pelo técnico a partir do equipamento é offline-first desde
// a Fase 6 — ver features/tickets/offline-actions.ts
// (createTicketFromEquipmentOffline) e TicketQuickFormDialog.

/** Edita título/descrição/prioridade. Requer edit_tickets. */
export async function updateTicket(
  ticketId: string,
  _prevState: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  await requireUser();
  await assertPermission("edit_tickets");

  const parsed = parseQuickForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("tickets")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
    })
    .eq("id", ticketId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidateTicket(ticketId);
  return { success: true };
}

/**
 * Atribui (ou remove a atribuição de) um técnico. Requer assign_tickets.
 * Ao atribuir um chamado ainda 'aberto', avança o status para 'designado' —
 * a primeira transição do workflow acontece naturalmente aqui.
 */
export async function assignTicket(
  ticketId: string,
  assignedUserId: string | null,
): Promise<void> {
  await requireUser();
  await assertPermission("assign_tickets");

  const supabase = await createSupabaseClient();
  const { data: current } = await supabase
    .from("tickets")
    .select("status")
    .eq("id", ticketId)
    .maybeSingle();

  const nextStatus =
    assignedUserId && current?.status === "aberto" ? "designado" : current?.status;

  await supabase
    .from("tickets")
    .update({ assigned_user_id: assignedUserId, status: nextStatus })
    .eq("id", ticketId);

  revalidateTicket(ticketId);
}

/** Muda o status do chamado (workflow manual). Requer edit_tickets. */
export async function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  await requireUser();
  await assertPermission("edit_tickets");

  const supabase = await createSupabaseClient();
  await supabase.from("tickets").update({ status }).eq("id", ticketId);

  revalidateTicket(ticketId);
}
