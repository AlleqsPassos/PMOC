import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
 * Lê/escreve a sessão via cookies (padrão @supabase/ssr para App Router).
 *
 * `setAll` pode falhar quando chamado a partir de um Server Component puro
 * (não pode escrever cookies) — nesse caso o erro é ignorado porque a sessão
 * já é atualizada pelo `src/proxy.ts` a cada requisição.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component — seguro ignorar
            // porque o proxy.ts já cuida do refresh de sessão.
          }
        },
      },
    },
  );
}
