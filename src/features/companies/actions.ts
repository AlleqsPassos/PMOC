"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCompanySchema } from "@/features/companies/schema";

export type CreateCompanyState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

/**
 * Cria a conta de autenticação, e em seguida a empresa + o primeiro
 * administrador via RPC create_company_and_admin() (SECURITY DEFINER,
 * atômico). Ver supabase/migrations/0006_auth_rpcs.sql.
 *
 * Pré-requisito de configuração do projeto Supabase: "Confirm email" deve
 * estar desativado (Authentication → Providers → Email) para que
 * signUp() já devolva uma sessão utilizável na mesma requisição — sem
 * isso, auth.uid() estaria nulo no momento da chamada ao RPC.
 */
export async function createCompanyAndAdmin(
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const parsed = createCompanySchema.safeParse({
    corporateName: formData.get("corporateName"),
    tradeName: formData.get("tradeName") || undefined,
    cnpj: formData.get("cnpj") || undefined,
    adminFullName: formData.get("adminFullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { corporateName, tradeName, cnpj, adminFullName, email, password } =
    parsed.data;

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
    { email, password },
  );

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (!signUpData.user) {
    return { error: "Não foi possível criar a conta." };
  }

  if (!signUpData.session) {
    return {
      error:
        "Conta criada, mas a confirmação de e-mail está ativa neste projeto Supabase. Desative 'Confirm email' em Authentication → Providers → Email e tente novamente, ou confirme o e-mail recebido e faça login manualmente.",
    };
  }

  const { error: rpcError } = await supabase.rpc("create_company_and_admin", {
    p_user_id: signUpData.user.id,
    p_corporate_name: corporateName,
    p_trade_name: tradeName ?? null,
    p_cnpj: cnpj ?? null,
    p_email: email,
    p_full_name: adminFullName,
  });

  if (rpcError) {
    return {
      error: `Conta criada, mas houve um erro ao configurar a empresa: ${rpcError.message}`,
    };
  }

  redirect("/minhas-atividades");
}
