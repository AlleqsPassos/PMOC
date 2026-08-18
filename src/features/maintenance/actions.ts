"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";

/**
 * A execução do atendimento é offline-first desde a Fase 6 (ver
 * `features/maintenance/offline-actions.ts`) — este arquivo voltou a existir na
 * Fase 12 só para o **fluxo administrativo**, que continua online.
 */

/**
 * Devolve ao técnico um atendimento que ele fechou como "aguardando peça".
 *
 * A regra que isto sustenta: quando o técnico pede peça, o atendimento **trava**
 * para ele — não faz sentido ficar reabrindo e alterando um serviço que depende
 * de material que ainda não chegou. Quem decide que dá para retomar é o
 * administrador, que é quem sabe se a peça chegou. É a tradução literal do que
 * o usuário pediu: "só poderá ser alterado novamente após o administrador
 * atribuir novamente aquele chamado para o técnico".
 *
 * Volta o registro para `draft` e limpa `resolution` — o técnico o reencontra na
 * divisão "Em aberto" da unidade no pull seguinte, sem nada de novo no schema
 * (as duas colunas já aceitam esses valores desde a Fase 10). `started_at` e
 * tudo que já foi preenchido (fotos, laudo, peças) continuam onde estavam: ele
 * retoma de onde parou, não recomeça.
 */
export async function reopenMaintenanceRecord(
  recordId: string,
  workOrderId: string,
): Promise<void> {
  await requireUser();
  await assertPermission("manage_work_orders");

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("maintenance_records")
    .update({ status: "draft", resolution: null, completed_at: null })
    .eq("id", recordId);

  if (error) {
    console.error("[reopenMaintenanceRecord]", error.message);
    return;
  }

  // A OS volta a "em andamento" se já estava fechada: liberar um equipamento
  // dentro de uma OS concluída deixaria o serviço reaberto e a OS dizendo o
  // contrário.
  await supabase
    .from("work_orders")
    .update({ status: "em_andamento", finished_at: null })
    .eq("id", workOrderId)
    .eq("status", "concluida");

  revalidatePath(`/ordens-servico/${workOrderId}`);
}
