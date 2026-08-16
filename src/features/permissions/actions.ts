"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import type { OverrideMode } from "@/features/permissions/schema";

/**
 * Muda o override de uma permissão pra um usuário-alvo. RLS
 * (`user_permissions_write_same_company`, 0004) já garante que o alvo é da
 * mesma empresa — não duplicado aqui, mesmo padrão das demais Server Actions
 * do projeto (RLS é a fronteira real, checagem em código é só UX).
 *
 * `user_permissions` não tem coluna `id` própria (PK composta), então o
 * trigger genérico de auditoria não serve pra ela (ver 0012_audit_logs.sql) —
 * captura manual aqui, exatamente como a arquitetura documentou pra "eventos
 * de negócio sem CRUD simples".
 */
export async function setUserPermissionOverride(
  userId: string,
  permissionId: string,
  permissionKey: string,
  mode: OverrideMode,
): Promise<{ error?: string }> {
  const actor = await requireUser();
  await assertPermission("manage_permissions");

  const supabase = await createSupabaseClient();

  if (mode === "default") {
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("permission_id", permissionId);
    if (error) return { error: `Não foi possível redefinir: ${error.message}` };
  } else {
    const { error } = await supabase.from("user_permissions").upsert(
      {
        user_id: userId,
        permission_id: permissionId,
        granted: mode === "allow",
        created_by: actor.id,
      },
      { onConflict: "user_id,permission_id" },
    );
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
  }

  // audit_logs não tem policy de insert pro cliente (só a trigger SECURITY
  // DEFINER escreve, ver 0012) — log_permission_change() (0037) é o
  // equivalente pra este caso sem trigger, revalidando manage_permissions e
  // que o alvo é da mesma empresa antes de gravar.
  const { error: auditError } = await supabase.rpc("log_permission_change", {
    p_user_id: userId,
    p_permission_key: permissionKey,
    p_mode: mode,
  });
  if (auditError) {
    console.error("[setUserPermissionOverride] log_permission_change", auditError.message);
  }

  revalidatePath("/configuracoes/permissoes");
  return {};
}
