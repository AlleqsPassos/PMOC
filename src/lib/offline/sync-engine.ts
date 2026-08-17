"use client";

import { toast } from "sonner";
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

/**
 * Conflito de verdade: o registro mudou no servidor depois do que este
 * dispositivo conhecia. Tipo próprio porque o tratamento é diferente de uma
 * falha comum — **não adianta tentar de novo**. A verdade do servidor já foi
 * repuxada; insistir com a mesma guarda daria o mesmo resultado para sempre.
 */
class SyncConflictError extends Error {}

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
      throw new SyncConflictError(
        "Este atendimento foi alterado em outro dispositivo. Os dados foram recarregados — confira e refaça se precisar.",
      );
    }
  }

  // Troca de foto (Fase 10): o objeto no Storage sai antes da linha, senão uma
  // falha no meio deixaria o binário órfão pagando espaço sem nenhum metadado
  // apontando para ele. Na outra ordem, o pior caso é uma linha sem arquivo —
  // detectável e recuperável; aqui o pior caso é invisível.
  if (item.entityTable === "attachments" && item.operation === "delete") {
    const path = String(item.payload.storage_path ?? "");
    if (path) {
      const { error: removeError } = await supabase.storage
        .from("attachments")
        .remove([path]);
      if (removeError) throw removeError;
    }
  }

  if (item.entityTable === "attachments" && item.operation === "insert") {
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
      : item.operation === "delete"
        ? await query.delete().eq("id", item.entityId)
        : await query.update(item.payload as never).eq("id", item.entityId);
  if (error) throw error;

  // Reancora a guarda otimista depois de gravar.
  //
  // Sem isto, a guarda acusa conflito contra a **própria edição anterior deste
  // aparelho**: o trigger `set_updated_at` mexe em `updated_at` a cada update,
  // mas a cópia local só é atualizada num pull completo — e o poll de 30s só
  // drena, não puxa. Resultado: "iniciar" (que drena e muda o `updated_at` no
  // servidor) deixava a cópia local defasada, e a conclusão seguinte batia num
  // conflito falso, para sempre, porque a guarda enfileirada nunca mudava.
  // Bug real: apareceu no QA da Fase 10, quando concluir com resolução virou o
  // caminho normal, mas a armadilha existia desde a Fase 6.
  if (item.entityTable === "maintenance_records" && item.operation !== "delete") {
    const { data: fresh } = await supabase
      .from("maintenance_records")
      .select("updated_at")
      .eq("id", item.entityId)
      .maybeSingle();
    if (fresh?.updated_at) {
      await offlineDb.maintenanceRecords.update(item.entityId, {
        updatedAt: fresh.updated_at,
      });
    }
  }

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
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    // 23505 = unique_violation. O caso real é a tag do equipamento, única por
    // empresa. A mensagem crua do Postgres não diz o que fazer — esta diz, e
    // oferece as duas saídas que o técnico de fato tem: desde a Fase 10 ele
    // ganhou `edit_equipment`, então corrigir a tag passou a ser possível
    // (antes só dava para descartar, e a mensagem original prometia uma edição
    // que ele não podia fazer — o defeito encontrado no QA da Fase 9).
    if (code === "23505") {
      return "Já existe um equipamento com essa tag na empresa. Corrija a tag deste cadastro ou descarte-o.";
    }
  }
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

let isDraining = false;

export async function drainOutbox(): Promise<void> {
  if (isDraining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  isDraining = true;
  let conflictNotice: string | null = null;
  try {
    const pending = await listPendingOutbox();
    for (const item of pending) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
      await markSyncing(item.id);
      try {
        await applyOutboxItem(item);
        await markSynced(item.id);
      } catch (err) {
        // Conflito sai da fila em vez de virar erro: a verdade do servidor já
        // foi repuxada e a guarda enfileirada não muda, então tentar de novo
        // repetiria o mesmo resultado indefinidamente — item preso para sempre,
        // com o selo de sincronização em erro permanente.
        if (err instanceof SyncConflictError) {
          await markSynced(item.id);
          conflictNotice = err.message;
          continue;
        }
        await markError(item.id, item.attemptCount + 1, errorMessage(err));
      }
    }
    // Fora do laço: o técnico não precisa ver um toast por item, precisa saber
    // que algo dele foi descartado.
    if (conflictNotice) toast.warning(conflictNotice);
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
