"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { partCatalogItemSchema } from "@/features/parts-catalog/schema";

export type PartCatalogFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

/**
 * Acrescenta uma peça ao catálogo **da empresa**. As linhas globais do seed
 * nascem por migration e nenhum tenant as edita — a RLS (0042) exige
 * `company_id = auth_company_id()` na escrita, então tentar não passaria daqui.
 */
export async function createPartCatalogItem(
  _prevState: PartCatalogFormState,
  formData: FormData,
): Promise<PartCatalogFormState> {
  const user = await requireUser();
  await assertPermission("manage_parts_catalog");

  const parsed = partCatalogItemSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("parts_catalog").insert({
    company_id: user.companyId,
    name: parsed.data.name.trim(),
    unit: parsed.data.unit?.trim() || null,
  });

  if (error) {
    // 23505 = a empresa já tem uma peça com esse nome (índice único por
    // lower(name)). Mensagem útil no lugar do erro cru do Postgres.
    if (error.code === "23505") {
      return { error: "Esta empresa já tem uma peça com esse nome." };
    }
    return { error: `Não foi possível cadastrar a peça: ${error.message}` };
  }

  revalidatePath("/configuracoes/pecas");
  return { success: true };
}

/**
 * Ativa/desativa uma peça. Não há delete: uma solicitação antiga pode citar a
 * peça, e desativar preserva esse histórico — mesma disciplina de soft-delete
 * do resto do sistema.
 */
export async function setPartCatalogItemActive(
  partId: string,
  isActive: boolean,
): Promise<void> {
  await requireUser();
  await assertPermission("manage_parts_catalog");

  const supabase = await createSupabaseClient();
  await supabase.from("parts_catalog").update({ is_active: isActive }).eq("id", partId);

  revalidatePath("/configuracoes/pecas");
}
