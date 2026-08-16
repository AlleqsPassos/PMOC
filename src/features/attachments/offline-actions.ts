"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";
import { MAX_ATTACHMENTS_PER_CATEGORY, type AttachmentCategory } from "@/features/attachments/schema";

/**
 * Equivalente offline de recordAttachment (Fase 4) — mas aqui o upload em
 * si não pode acontecer offline. O Blob fica em `attachmentBlobs`; o
 * outbox só guarda o `storage_path` já calculado (determinístico, pelo id
 * do próprio anexo) e o metadado. O drain (`sync-engine.ts`) sobe o Blob
 * pro Storage primeiro e só então insere a linha — mesma ordem de
 * dependência do upload direto que já existia (Fase 4.2), só adiada.
 */
export async function recordAttachmentOffline(params: {
  companyId: string;
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  category: AttachmentCategory;
  file: File;
}): Promise<{ error?: string; id?: string }> {
  const count = await offlineDb.attachments
    .where("maintenanceRecordId")
    .equals(params.maintenanceRecordId)
    .filter((a) => a.category === params.category)
    .count();
  if (count >= MAX_ATTACHMENTS_PER_CATEGORY) {
    return { error: `Limite de ${MAX_ATTACHMENTS_PER_CATEGORY} fotos nesta categoria já atingido.` };
  }

  const id = crypto.randomUUID();
  const ext = params.file.name.includes(".") ? params.file.name.split(".").pop() : "bin";
  const storagePath = `company/${params.companyId}/work-orders/${params.workOrderId}/${params.category}/${id}.${ext}`;
  const createdAt = new Date().toISOString();

  await offlineDb.attachmentBlobs.add({ id, blob: params.file });
  await offlineDb.attachments.add({
    id,
    workOrderId: params.workOrderId,
    maintenanceRecordId: params.maintenanceRecordId,
    equipmentId: params.equipmentId,
    category: params.category,
    fileName: params.file.name,
    mimeType: params.file.type || "application/octet-stream",
    sizeBytes: params.file.size,
    storagePath: null, // só passa a existir de verdade depois do upload no drain
    createdAt,
  });
  await enqueue({
    entityTable: "attachments",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: params.companyId,
      work_order_id: params.workOrderId,
      maintenance_record_id: params.maintenanceRecordId,
      equipment_id: params.equipmentId,
      category: params.category,
      storage_path: storagePath,
      file_name: params.file.name,
      mime_type: params.file.type || "application/octet-stream",
      size_bytes: params.file.size,
    },
  });
  requestSync();
  return { id };
}
