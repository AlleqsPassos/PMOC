"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";
import type { TicketPriority } from "@/features/tickets/schema";

/**
 * Equivalente offline de createTicketFromEquipment (Fase 3) — a
 * localização (cliente/unidade) vem do cache local de equipamentos
 * (`offlineDb.equipment`, populado por pull-sync.ts com o dataset inteiro
 * da empresa, não só o do técnico). Setor/ambiente ficam null aqui — só o
 * fluxo online resolve essa granularidade extra; simplificação aceita
 * porque não afeta RLS/segurança (colunas nullable), só o nível de detalhe
 * exibido no chamado.
 */
export async function createTicketFromEquipmentOffline(params: {
  equipmentId: string;
  title: string;
  description: string | null;
  priority: TicketPriority;
}): Promise<{ error?: string }> {
  const equipment = await offlineDb.equipment.get(params.equipmentId);
  if (!equipment) {
    return { error: "Equipamento não encontrado localmente. Conecte-se e tente novamente." };
  }

  const [company, user] = await Promise.all([
    offlineDb.meta.get("companyId"),
    offlineDb.meta.get("userId"),
  ]);
  const companyId = company?.value ?? "";
  const userId = user?.value ?? "";

  const id = crypto.randomUUID();
  const openedAt = new Date().toISOString();

  await offlineDb.tickets.add({
    id,
    title: params.title,
    description: params.description,
    priority: params.priority,
    status: "aberto",
    clientId: equipment.clientId,
    clientName: equipment.clientName,
    unitId: equipment.unitId,
    unitName: equipment.unitName,
    equipmentId: equipment.id,
    equipmentTag: equipment.tag,
    openedByUserId: userId,
    openedAt,
    workOrderId: null,
  });
  await enqueue({
    entityTable: "tickets",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      client_id: equipment.clientId,
      unit_id: equipment.unitId,
      sector_id: null,
      environment_id: null,
      equipment_id: equipment.id,
      title: params.title,
      description: params.description,
      priority: params.priority,
      opened_by_user_id: userId,
    },
  });
  requestSync();
  return {};
}
