import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentCompany() {
  const supabase = await createClient();
  // Sem .eq(company_id, ...): a policy companies_select_own já restringe a
  // uma única linha visível (a da empresa do usuário autenticado).
  const { data, error } = await supabase
    .from("companies")
    .select("id, corporate_name, trade_name, status, created_at")
    .single();

  if (error) {
    console.error("[getCurrentCompany]", error.message);
    return null;
  }

  return data;
}
