"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";
import { maxAttachmentsFor, type AttachmentCategory } from "@/features/attachments/schema";

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
  const max = maxAttachmentsFor(params.category);
  const count = await offlineDb.attachments
    .where("maintenanceRecordId")
    .equals(params.maintenanceRecordId)
    .filter((a) => a.category === params.category)
    .count();
  if (count >= max) {
    return {
      error:
        max === 1
          ? "Só cabe uma foto nesta categoria. Remova a atual para trocar."
          : `Limite de ${max} fotos nesta categoria já atingido.`,
    };
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

/**
 * Remove uma foto — o caminho para trocar uma foto ruim, agora que as
 * categorias obrigatórias têm limite 1 (Fase 10).
 *
 * Se a foto **ainda não subiu**, não há nada a apagar no servidor: o insert
 * pendente é simplesmente retirado da fila junto com o blob local. Enfileirar um
 * delete nesse caso criaria um par insert+delete que sobe a foto só para
 * apagá-la em seguida — trabalho de rede inútil, e pior, se o insert falhasse o
 * delete tentaria remover uma linha que nunca existiu e ficaria em erro para
 * sempre.
 */
export async function removeAttachmentOffline(attachmentId: string): Promise<void> {
  const attachment = await offlineDb.attachments.get(attachmentId);
  if (!attachment) return;

  const pendingInsert = await offlineDb.outbox
    .filter(
      (i) =>
        i.entityTable === "attachments" &&
        i.entityId === attachmentId &&
        i.operation === "insert",
    )
    .toArray();

  const storagePath =
    attachment.storagePath ??
    String(pendingInsert[0]?.payload.storage_path ?? "");

  if (pendingInsert.length > 0) {
    await offlineDb.transaction(
      "rw",
      [offlineDb.attachments, offlineDb.attachmentBlobs, offlineDb.outbox],
      async () => {
        await offlineDb.attachments.delete(attachmentId);
        await offlineDb.attachmentBlobs.delete(attachmentId);
        await offlineDb.outbox.bulkDelete(pendingInsert.map((i) => i.id));
      },
    );
    return;
  }

  await offlineDb.transaction(
    "rw",
    [offlineDb.attachments, offlineDb.attachmentBlobs],
    async () => {
      await offlineDb.attachments.delete(attachmentId);
      await offlineDb.attachmentBlobs.delete(attachmentId);
    },
  );
  await enqueue({
    entityTable: "attachments",
    entityId: attachmentId,
    operation: "delete",
    // O path viaja no payload porque o objeto do Storage tem que sair junto e o
    // drain não tem mais a linha local para consultar.
    payload: { storage_path: storagePath },
  });
  requestSync();
}
