"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { clientSchema } from "@/features/clients/schema";

export type ClientFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function parseClientForm(formData: FormData) {
  return clientSchema.safeParse({
    corporateName: formData.get("corporateName"),
    tradeName: formData.get("tradeName") || undefined,
    cnpj: formData.get("cnpj") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    responsibleName: formData.get("responsibleName") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

/** Cria um cliente. Requer create_clients. */
export async function createClient(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const user = await requireUser();
  await assertPermission("create_clients");

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("clients").insert({
    company_id: user.companyId,
    corporate_name: parsed.data.corporateName,
    trade_name: parsed.data.tradeName || null,
    cnpj: parsed.data.cnpj || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    responsible_name: parsed.data.responsibleName || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: `Não foi possível criar o cliente: ${error.message}` };
  }

  revalidatePath("/clientes");
  return { success: true };
}

/** Edita um cliente existente. Requer edit_clients. */
export async function updateClient(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser();
  await assertPermission("edit_clients");

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({
      corporate_name: parsed.data.corporateName,
      trade_name: parsed.data.tradeName || null,
      cnpj: parsed.data.cnpj || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      responsible_name: parsed.data.responsibleName || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", clientId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  return { success: true };
}

/**
 * Ativa/inativa um cliente. Sem deleted_at nesta tabela por design (ver
 * migration 0007) — "excluir" na UI é sempre isto.
 */
export async function setClientStatus(
  clientId: string,
  status: "active" | "inactive",
): Promise<void> {
  await requireUser();
  await assertPermission("edit_clients");

  const supabase = await createSupabaseClient();
  await supabase.from("clients").update({ status }).eq("id", clientId);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}
