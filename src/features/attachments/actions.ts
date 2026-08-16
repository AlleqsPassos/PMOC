"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  MAX_ATTACHMENTS_PER_CATEGORY,
  type AttachmentCategory,
} from "@/features/attachments/schema";

/**
 * Grava só os metadados — o binário já foi enviado direto pro Storage pelo
 * client component antes de chamar esta action (ver attachment-uploader.tsx).
 * Se o limite já foi atingido, o arquivo fica órfão no bucket (aceitável no
 * MVP — sem faxina automática de storage ainda).
 */
export async function recordAttachment(params: {
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  category: AttachmentCategory;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ error?: string }> {
  const user = await requireUser();

  const [canExecute, canManage] = await Promise.all([
    hasPermission("execute_work_order"),
    hasPermission("manage_work_orders"),
  ]);
  if (!canExecute && !canManage) {
    return { error: "Permissão negada." };
  }

  const supabase = await createSupabaseClient();

  const { count } = await supabase
    .from("attachments")
    .select("id", { count: "exact", head: true })
    .eq("work_order_id", params.workOrderId)
    .eq("equipment_id", params.equipmentId)
    .eq("category", params.category);

  if (count && count >= MAX_ATTACHMENTS_PER_CATEGORY) {
    return { error: `Limite de ${MAX_ATTACHMENTS_PER_CATEGORY} fotos nesta categoria já atingido.` };
  }

  const { error } = await supabase.from("attachments").insert({
    company_id: user.companyId,
    work_order_id: params.workOrderId,
    maintenance_record_id: params.maintenanceRecordId,
    equipment_id: params.equipmentId,
    category: params.category,
    storage_path: params.storagePath,
    file_name: params.fileName,
    mime_type: params.mimeType,
    size_bytes: params.sizeBytes,
    uploaded_by: user.id,
  });

  if (error) {
    return { error: `Não foi possível registrar a foto: ${error.message}` };
  }

  revalidatePath(`/ordens-servico/${params.workOrderId}/atender/${params.maintenanceRecordId}`);
  return {};
}
