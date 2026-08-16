"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import type { PartsRequestStatus } from "@/features/parts-requests/schema";

// Criação de solicitação de peça é offline-first desde a Fase 6 — ver
// features/parts-requests/offline-actions.ts (createPartsRequestOffline).
// Esta Server Action fica só com o fluxo administrativo, que continua
// online (telas de despachante).

/** Admin avança o status da solicitação — fluxo administrativo, não é o técnico que fecha. */
export async function updatePartsRequestStatus(
  requestId: string,
  workOrderId: string,
  status: PartsRequestStatus,
): Promise<void> {
  const user = await requireUser();
  await assertPermission("manage_parts_requests");

  const supabase = await createSupabaseClient();
  await supabase
    .from("parts_requests")
    .update({ status, updated_by: user.id })
    .eq("id", requestId);

  revalidatePath(`/ordens-servico/${workOrderId}`);
}
