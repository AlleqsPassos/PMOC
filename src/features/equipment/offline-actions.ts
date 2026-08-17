"use client";

import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { requestSync } from "@/lib/offline/sync-engine";

async function localContext() {
  const [company, user] = await Promise.all([
    offlineDb.meta.get("companyId"),
    offlineDb.meta.get("userId"),
  ]);
  return { companyId: company?.value ?? "", userId: user?.value ?? "" };
}

/**
 * Cria um ambiente (sala) offline. Existe porque
 * `equipment.environment_id` é NOT NULL: o técnico acha um aparelho numa sala
 * que ninguém cadastrou e precisa registrar as duas coisas na hora.
 *
 * Requer `create_environments`, concedido ao RESPONSAVEL_TECNICO em
 * 0040_seed_permissions_tecnico_campo.sql. `sector_id` fica null — a camada
 * de setor é opcional no schema e não faz sentido pedir isso em campo.
 */
export async function createEnvironmentOffline(params: {
  unitId: string;
  name: string;
}): Promise<{ id?: string; error?: string }> {
  const { companyId } = await localContext();
  if (!companyId) {
    return { error: "Dados locais incompletos. Conecte-se uma vez e tente de novo." };
  }

  const id = crypto.randomUUID();

  await offlineDb.environments.add({
    id,
    unitId: params.unitId,
    sectorId: null,
    name: params.name,
  });
  await enqueue({
    entityTable: "environments",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      unit_id: params.unitId,
      sector_id: null,
      name: params.name,
    },
  });
  requestSync();
  return { id };
}

/**
 * Corrige o cadastro de um equipamento (Fase 10).
 *
 * Só existe porque o RESPONSAVEL_TECNICO ganhou `edit_equipment` na 0043 — a
 * Fase 9 dava a ele só INSERT. É `update()` puro no drain, nunca upsert: um
 * payload parcial num upsert vira INSERT hipotético e a validação NOT NULL/RLS
 * roda antes de o Postgres checar o conflito (bug real da Fase 6).
 *
 * Unidade e ambiente ficam de fora: mudar um aparelho de sala é remanejamento de
 * planta, não correção de cadastro, e envolve consistência com OS já geradas.
 */
export async function updateEquipmentOffline(params: {
  id: string;
  tag: string;
  type: string | null;
  brand: string | null;
  model: string | null;
}): Promise<{ error?: string }> {
  const { companyId } = await localContext();
  if (!companyId) {
    return { error: "Dados locais incompletos. Conecte-se uma vez e tente de novo." };
  }

  const tag = params.tag.trim();
  if (!tag) return { error: "Informe a tag do equipamento." };

  const clash = await offlineDb.equipment.where("tag").equals(tag).first();
  if (clash && clash.id !== params.id) {
    return { error: `A tag "${tag}" já está em uso por outro equipamento.` };
  }

  await offlineDb.equipment.update(params.id, {
    tag,
    type: params.type,
    brand: params.brand,
    model: params.model,
  });
  await enqueue({
    entityTable: "equipment",
    entityId: params.id,
    operation: "update",
    payload: {
      id: params.id,
      company_id: companyId,
      tag,
      type: params.type,
      brand: params.brand,
      model: params.model,
    },
  });
  requestSync();
  return {};
}

/**
 * Descarta um cadastro de equipamento que o servidor recusou — na prática,
 * tag duplicada, que só é detectável no drain (o aparelho não tem o catálogo
 * completo da empresa).
 *
 * Existe porque o técnico **não tem `edit_equipment`**: sem uma saída, o item
 * ficaria preso na fila tentando para sempre, com uma mensagem de erro sobre
 * a qual ele não poderia agir. Remove a linha local e o item da fila, para ele
 * refazer o cadastro com outra tag.
 */
export async function discardFailedEquipmentOffline(
  equipmentId: string,
): Promise<void> {
  const items = await offlineDb.outbox
    .where("status")
    .equals("error")
    .toArray();

  await offlineDb.transaction("rw", [offlineDb.equipment, offlineDb.outbox], async () => {
    await offlineDb.equipment.delete(equipmentId);
    await offlineDb.outbox.bulkDelete(
      items
        .filter((i) => i.entityTable === "equipment" && i.entityId === equipmentId)
        .map((i) => i.id),
    );
  });
}

/**
 * Cadastra em campo um equipamento que não estava registrado (Fase 9).
 *
 * A tag é única por empresa. Desde a Fase 10 o aparelho baixa o catálogo da
 * empresa inteira, então a checagem local abaixo pega praticamente toda colisão
 * — mas não substitui a do banco: outro técnico pode ter cadastrado a mesma tag
 * desde o último pull. Nesse caso a falha aparece no drain, com a mensagem
 * tratada em `sync-engine.ts`.
 *
 * Se o ambiente também acabou de ser criado offline, a ordem do outbox
 * resolve a FK sozinha: a fila drena por `createdAt`, então o insert do
 * ambiente sobe antes do equipamento que o referencia.
 */
export async function createEquipmentOffline(params: {
  unitId: string;
  environmentId: string;
  tag: string;
  type: string | null;
  brand: string | null;
  model: string | null;
}): Promise<{ error?: string }> {
  const { companyId } = await localContext();
  if (!companyId) {
    return { error: "Dados locais incompletos. Conecte-se uma vez e tente de novo." };
  }

  const tag = params.tag.trim();
  if (!tag) return { error: "Informe a tag do equipamento." };

  // Colisão dentro do que o aparelho conhece dá para pegar aqui e evitar uma
  // ida ao servidor destinada a falhar. Não substitui a checagem do banco.
  const existing = await offlineDb.equipment.where("tag").equals(tag).first();
  if (existing) {
    return { error: `A tag "${tag}" já está em uso na empresa.` };
  }

  // Nome de unidade/cliente para exibição: copiados de um equipamento ou da
  // OS da mesma unidade, que já estão em cache. Se não houver nenhum (unidade
  // sem equipamento ainda), cai no nome da própria OS atribuída.
  const sibling = await offlineDb.equipment.where("unitId").equals(params.unitId).first();
  const workOrder = sibling
    ? null
    : await offlineDb.workOrders.where("unitId").equals(params.unitId).first();

  const id = crypto.randomUUID();

  await offlineDb.equipment.add({
    id,
    tag,
    type: params.type,
    brand: params.brand,
    model: params.model,
    unitId: params.unitId,
    environmentId: params.environmentId,
    unitName: sibling?.unitName ?? workOrder?.unitName ?? "—",
    clientId: sibling?.clientId ?? workOrder?.clientId ?? "",
    clientName: sibling?.clientName ?? workOrder?.clientName ?? "—",
  });
  await enqueue({
    entityTable: "equipment",
    entityId: id,
    operation: "insert",
    payload: {
      id,
      company_id: companyId,
      unit_id: params.unitId,
      sector_id: null,
      environment_id: params.environmentId,
      tag,
      type: params.type,
      brand: params.brand,
      model: params.model,
    },
  });
  requestSync();
  return {};
}
