"use client";

import { createClient } from "@/lib/supabase/client";
import { offlineDb, type OutboxItem } from "@/lib/offline/db";
import { listPendingOutbox, markSyncing, markSynced, markError } from "@/lib/offline/outbox";
import {
  pullTechnicianData,
  resetLocalDbIfUserChanged,
} from "@/lib/offline/pull-sync";

/**
 * Motor de sync — drena o outbox em ordem de criação, upsert idempotente
 * por PK client-gerada (seção 12/13 da arquitetura). Guarda otimista só
 * pra `maintenance_records.status`/narrativa via `guardUpdatedAt`: se o
 * servidor mudou depois do último pull, descarta o otimista local e repuxa
 * a verdade em vez de sobrescrever silenciosamente (conflito é raro por
 * design — single-writer por registro — então um refetch simples basta,
 * sem UI de merge).
 */

async function applyOutboxItem(item: OutboxItem): Promise<void> {
  const supabase = createClient();

  if (item.entityTable === "maintenance_records" && item.operation === "update" && item.guardUpdatedAt) {
    const { data: current } = await supabase
      .from("maintenance_records")
      .select("updated_at")
      .eq("id", item.entityId)
      .maybeSingle();
    if (current && current.updated_at !== item.guardUpdatedAt) {
      await pullTechnicianData();
      throw new Error("CONFLICT: registro foi atualizado por outro dispositivo — dados recarregados.");
    }
  }

  if (item.entityTable === "attachments") {
    const blobRow = await offlineDb.attachmentBlobs.get(item.entityId);
    if (blobRow) {
      const path = String(item.payload.storage_path ?? "");
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, blobRow.blob, {
          contentType: String(item.payload.mime_type ?? "application/octet-stream"),
        });
      if (uploadError) throw uploadError;
      await offlineDb.attachmentBlobs.delete(item.entityId);
      await offlineDb.attachments.update(item.entityId, { storagePath: path });
    }
  }

  // `item.entityTable` é uma união de tabelas reais, mas o payload genérico
  // (montado por cada feature offline em snake_case) não dá pro Supabase
  // tipar polimorficamente aqui — o cast é local a este ponto de entrada
  // único do drain, cada call site que monta o payload já é tipado contra
  // o schema da tabela específica.
  //
  // "insert" usa upsert (idempotente por PK client-gerada — pode reaplicar
  // sem duplicar). "update" usa update()/eq('id') puro, NUNCA upsert: um
  // upsert vira `INSERT ... ON CONFLICT DO UPDATE` no Postgres, e a
  // validação NOT NULL/RLS do INSERT roda contra a linha hipotética *antes*
  // de sequer checar o conflito — um payload parcial de update (só os
  // campos que mudaram) violaria colunas NOT NULL que nem estão no
  // payload, mesmo a linha já existindo. Bug real encontrado no QA offline
  // desta fase (maintenance_records.work_order_id/company_id).
  const query = supabase.from(item.entityTable);
  const { error } =
    item.operation === "insert"
      ? await query.upsert(item.payload as never, { onConflict: "id" })
      : await query.update(item.payload as never).eq("id", item.entityId);
  if (error) throw error;

  const companyId = (await offlineDb.meta.get("companyId"))?.value;
  const userId = (await offlineDb.meta.get("userId"))?.value;
  if (companyId) {
    const { error: ledgerError } = await supabase.from("sync_operations").insert({
      company_id: companyId,
      user_id: userId ?? null,
      idempotency_key: item.id,
      entity_type: item.entityTable,
      entity_id: item.entityId,
    });
    // Unique violation em idempotency_key = este item já foi aplicado antes
    // (retry após falha parcial) — não é um erro de verdade.
    if (ledgerError && ledgerError.code !== "23505") {
      console.warn("[sync-engine] sync_operations", ledgerError.message);
    }
  }
}

/** Supabase/PostgREST erros vêm como objeto plano `{message, details, hint, code}`, não `instanceof Error`. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

let isDraining = false;

export async function drainOutbox(): Promise<void> {
  if (isDraining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  isDraining = true;
  try {
    const pending = await listPendingOutbox();
    for (const item of pending) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
      await markSyncing(item.id);
      try {
        await applyOutboxItem(item);
        await markSynced(item.id);
      } catch (err) {
        await markError(item.id, item.attemptCount + 1, errorMessage(err));
      }
    }
  } finally {
    isDraining = false;
  }
}

let syncQueued = false;

/** Pede um drain sem duplicar chamadas concorrentes — seguro de chamar de qualquer lugar (enqueue, eventos, poll). */
export function requestSync(): void {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(() => {
    syncQueued = false;
    void drainOutbox();
  });
}

/**
 * Drena a fila e só then puxa dado fresco do servidor — nessa ordem, nunca
 * o contrário. Puxar primeiro sobrescreveria (bulkPut) a linha local de
 * `maintenance_records` com o estado *anterior* do servidor, porque a
 * edição otimista local ainda não chegou lá — a UI "voltaria no tempo" por
 * um instante até o drain (que roda depois) reaplicar. Bug real encontrado
 * no QA "modo avião" desta fase.
 */
export async function drainThenPull(): Promise<void> {
  // Antes de tudo: se o dispositivo trocou de usuário, o banco local do
  // anterior é apagado. Precisa vir *antes* do drain — senão os itens de
  // outbox do usuário anterior seriam enviados sob a sessão do novo.
  await resetLocalDbIfUserChanged();
  await drainOutbox();
  await pullTechnicianData();
}

/**
 * Liga os gatilhos de sync uma vez no layout do técnico. Ressalva de
 * plataforma (seção 12): iOS Safari não tem Background Sync API confiável
 * — por isso três gatilhos independentes, nenhum dependente de um único
 * mecanismo: reconexão, foreground, e polling de foreground a cada 30s.
 */
export function setupSyncTriggers(): () => void {
  const onOnline = () => {
    void drainThenPull();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible" && navigator.onLine) requestSync();
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibility);
  const pollTimer = setInterval(() => {
    if (navigator.onLine) requestSync();
  }, 30_000);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibility);
    clearInterval(pollTimer);
  };
}
