"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";

/** Equivalente offline de createPartsRequest (Fase 4) — grava local + enfileira. */
export async function createPartsRequestOffline(params: {
  workOrderId: string;
  maintenanceRecordId: string;
  partName: string;
  quantity: number;
  note: string | null;
}): Promise<void> {
  const [company, user] = await Promise.all([
    offlineDb.meta.get("companyId"),
    offlineDb.meta.get("userId"),
  ]);
  const companyId = company?.value ?? "";
  const userId = user?.value ?? "";
  const userFullName = (await offlineDb.meta.get("userFullName"))?.value ?? "—";

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await offlineDb.partsRequests.add({
    id,
    workOrderId: params.workOrderId,
    maintenanceRecordId: params.maintenanceRecordId,
    partName: params.partName,
    quantity: params.quantity,
    note: params.note,
    status: "Solicitada",
    requestedByName: userFullName,
    createdAt,
  });
  await enqueue({
    entityTable: "parts_requests",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      work_order_id: params.workOrderId,
      maintenance_record_id: params.maintenanceRecordId,
      requested_by_user_id: userId,
      part_name: params.partName,
      quantity: params.quantity,
      note: params.note,
    },
  });
  requestSync();
}
