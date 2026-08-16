"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission, hasPermission } from "@/lib/auth/permissions";
import { partsRequestSchema, type PartsRequestStatus } from "@/features/parts-requests/schema";

export type PartsRequestFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

/** Técnico cria a solicitação durante a execução. Requer execute_work_order (ou manage_work_orders). */
export async function createPartsRequest(
  workOrderId: string,
  maintenanceRecordId: string,
  _prevState: PartsRequestFormState,
  formData: FormData,
): Promise<PartsRequestFormState> {
  const user = await requireUser();

  const [canExecute, canManage] = await Promise.all([
    hasPermission("execute_work_order"),
    hasPermission("manage_work_orders"),
  ]);
  if (!canExecute && !canManage) {
    return { error: "Permissão negada." };
  }

  const parsed = partsRequestSchema.safeParse({
    partName: formData.get("partName"),
    quantity: formData.get("quantity") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const quantity = parsed.data.quantity ? Number(parsed.data.quantity) : 1;

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("parts_requests").insert({
    company_id: user.companyId,
    work_order_id: workOrderId,
    maintenance_record_id: maintenanceRecordId,
    requested_by_user_id: user.id,
    part_name: parsed.data.partName,
    quantity: Number.isNaN(quantity) ? 1 : quantity,
    note: parsed.data.note || null,
  });

  if (error) {
    return { error: `Não foi possível registrar a solicitação: ${error.message}` };
  }

  revalidatePath(`/ordens-servico/${workOrderId}`);
  revalidatePath(`/ordens-servico/${workOrderId}/atender/${maintenanceRecordId}`);
  return { success: true };
}

/** Admin avança o status da solicitação — fluxo administrativo, não é o técnico que fecha. */
export async function updatePartsRequestStatus(
  requestId: string,
  workOrderId: string,
  status: PartsRequestStatus,
): Promise<void> {
  const user = await requireUser();
  await assertPermission("manage_parts_requests");

  const supabase = await createSupabaseClient();
  await supabase
    .from("parts_requests")
    .update({ status, updated_by: user.id })
    .eq("id", requestId);

  revalidatePath(`/ordens-servico/${workOrderId}`);
}
