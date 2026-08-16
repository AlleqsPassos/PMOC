import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  companyId: string;
  roleId: string;
  roleKey: string;
  fullName: string;
  email: string;
};

/**
 * Usuário autenticado + linha correspondente em public.users (empresa,
 * papel). `cache()` memoiza por render pass — chamar em vários lugares
 * (layout, page, componentes) não multiplica as queries.
 *
 * Retorna null se não há sessão OU se a sessão existe mas ainda não tem
 * linha em public.users (não deveria acontecer em uso normal, já que
 * create_company_and_admin/activate_invite criam as duas coisas juntas —
 * mas pode acontecer se o usuário fechar o fluxo no meio).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, company_id, role_id, full_name, email, role:roles(key)")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error || !data) return null;

  const roleKey = Array.isArray(data.role) ? data.role[0]?.key : data.role?.key;

  return {
    id: data.id,
    companyId: data.company_id,
    roleId: data.role_id,
    roleKey: roleKey ?? "",
    fullName: data.full_name,
    email: data.email,
  };
});

/** Usa em Server Components/Actions que exigem sessão — redireciona para /login se não houver. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
