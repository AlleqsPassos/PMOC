"use client";

import { offlineDb, type OutboxItem, type OutboxTable } from "@/lib/offline/db";

/**
 * Camada pura de dados do outbox — só grava/lê a fila. Quem decide *quando*
 * drenar é `sync-engine.ts` (nunca aqui, evita import circular); quem
 * decide o que escrever na tabela espelho local (otimista, antes mesmo da
 * fila existir) é o call site em cada feature offline (`features/maintenance`
 * etc.), porque só ele sabe o formato camelCase da UI — o outbox só guarda
 * o payload já em snake_case, pronto pro Supabase.
 */
export async function enqueue(params: {
  entityTable: OutboxTable;
  entityId: string;
  operation: OutboxItem["operation"];
  payload: Record<string, unknown>;
  guardUpdatedAt?: string;
}): Promise<void> {
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    entityTable: params.entityTable,
    entityId: params.entityId,
    operation: params.operation,
    payload: params.payload,
    guardUpdatedAt: params.guardUpdatedAt,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    lastAttemptAt: null,
    lastError: null,
    status: "pending",
  };
  await offlineDb.outbox.add(item);
}

/**
 * Itens elegíveis pra este ciclo de drain — `pending` sempre; `error` só se
 * o backoff exponencial (baseado em `attemptCount`) já decorreu desde
 * `lastAttemptAt`. Não bloqueia o loop com `setTimeout`: um item que ainda
 * está "esfriando" simplesmente fica de fora e tenta de novo no próximo
 * gatilho de sync (reconexão/foreground/poll).
 */
export async function listPendingOutbox(): Promise<OutboxItem[]> {
  const all = await offlineDb.outbox
    .where("status")
    .anyOf(["pending", "error"])
    .sortBy("createdAt");

  const now = Date.now();
  return all.filter((item) => {
    if (item.status === "pending") return true;
    if (!item.lastAttemptAt) return true;
    const waitMs = Math.min(1000 * 2 ** item.attemptCount, 60_000);
    return now - new Date(item.lastAttemptAt).getTime() >= waitMs;
  });
}

export async function markSyncing(id: string): Promise<void> {
  await offlineDb.outbox.update(id, { status: "syncing" });
}

export async function markSynced(id: string): Promise<void> {
  await offlineDb.outbox.delete(id);
}

export async function markError(id: string, attemptCount: number, message: string): Promise<void> {
  await offlineDb.outbox.update(id, {
    status: "error",
    attemptCount,
    lastAttemptAt: new Date().toISOString(),
    lastError: message,
  });
}
