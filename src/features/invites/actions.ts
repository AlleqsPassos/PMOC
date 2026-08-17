"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  activateInviteSchema,
  createInviteSchema,
} from "@/features/invites/schema";

// Sem caracteres ambíguos (0/O, 1/I/l) — o código é lido e digitado
// manualmente pelo técnico a partir do que o admin repassa por WhatsApp.
const generateCode = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  8,
);

export type CreateInviteState =
  | { error?: string; fieldErrors?: Record<string, string[]>; code?: string }
  | undefined;

/** Admin gera um convite para Responsável Técnico. Requer manage_users. */
export async function createInvite(
  _prevState: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const user = await requireUser();
  await assertPermission("manage_users");

  const parsed = createInviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("key", "RESPONSAVEL_TECNICO")
    .single();

  if (roleError || !role) {
    return { error: "Papel RESPONSAVEL_TECNICO não encontrado." };
  }

  const code = generateCode();

  const { error: insertError } = await supabase.from("invites").insert({
    company_id: user.companyId,
    role_id: role.id,
    code,
    full_name: parsed.data.fullName,
    email: parsed.data.email || null,
    created_by: user.id,
  });

  if (insertError) {
    return { error: `Não foi possível gerar o convite: ${insertError.message}` };
  }

  revalidatePath("/configuracoes/usuarios");
  return { code };
}

/** Revoga um convite pendente. Requer manage_users. */
export async function revokeInvite(inviteId: string): Promise<void> {
  await requireUser();
  await assertPermission("manage_users");

  const supabase = await createClient();
  await supabase
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("status", "pending");

  revalidatePath("/configuracoes/usuarios");
}

export type ActivateInviteState = { error?: string } | undefined;

/**
 * Ativação pública (sem sessão prévia). O código vem do próprio formulário —
 * o técnico digita na tela de login o que o admin repassou. Ele não é validado
 * por leitura direta da tabela `invites` (sem policy anônima de select — ver
 * 0004_rls_base.sql): a validação inteira acontece dentro do RPC
 * activate_invite(), que roda como SECURITY DEFINER.
 */
export async function activateInvite(
  _prevState: ActivateInviteState,
  formData: FormData,
): Promise<ActivateInviteState> {
  const parsed = activateInviteSchema.safeParse({
    // Digitado à mão: normaliza caixa e espaços antes de validar, senão um
    // código colado com espaço sobrando falha como "convite inválido".
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Preencha o código, nome, e-mail e senha (mín. 8 caracteres)." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (!signUpData.user) {
    return { error: "Não foi possível criar a conta." };
  }

  if (!signUpData.session) {
    return {
      error:
        "Conta criada, mas a confirmação de e-mail está ativa neste projeto Supabase. Desative 'Confirm email' em Authentication → Providers → Email para ativar convites sem essa etapa no MVP.",
    };
  }

  const { error: rpcError } = await supabase.rpc("activate_invite", {
    p_code: parsed.data.code,
    p_user_id: signUpData.user.id,
    p_full_name: parsed.data.fullName,
  });

  if (rpcError) {
    // Conta de auth já foi criada mas o convite não foi consumido (código
    // inválido/expirado/já usado) — usa a admin client para desfazer,
    // evitando uma identidade órfã sem empresa presa no Auth.
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(signUpData.user.id);
    return { error: "Convite inválido, expirado ou já utilizado." };
  }

  redirect("/minhas-atividades");
}
