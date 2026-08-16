import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase com a service role key — ignora RLS.
 *
 * NUNCA importar este módulo em um Client Component (o `import "server-only"`
 * quebra o build se isso acontecer). Uso restrito a bootstrapping controlado
 * server-side: criação de empresa (create_company_and_admin) e ativação de
 * convite (activate_invite). Toda outra operação deve passar pelo cliente
 * `server.ts`, que respeita RLS.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
