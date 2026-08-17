import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renomeou "Middleware" para "Proxy" (mesma funcionalidade,
// arquivo `src/proxy.ts`, função exportada `proxy`). Ver
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.

// Rotas acessíveis sem sessão. Qualquer rota fora desta lista (e fora de
// _next/estáticos) exige usuário autenticado.
const PUBLIC_PATH_PREFIXES = ["/login", "/criar-empresa", "/ativar-convite"];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  // Enquanto o projeto Supabase ainda não foi criado/configurado (.env.local
  // vazio), deixa passar sem checagem em vez de derrubar todo o dev server —
  // isso é só para permitir construir UI antes da Fase 1 passo 5. Nunca deve
  // acontecer em produção (as env vars são obrigatórias no deploy).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[proxy] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes — pulando checagem de sessão (dev only).",
      );
      return NextResponse.next();
    }
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.",
    );
  }

  // Resposta mutável: cookies atualizados pelo Supabase são reaplicados nela.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalida o token contra o Supabase Auth (não confiar em
  // getSession() aqui — ele só lê o cookie, sem verificar validade).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login";

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/minhas-atividades";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // sw.js/icon.png/apple-icon.png são as convenções de arquivo do Next
    // para o service worker e ícones do PWA — precisam ser públicas, senão
    // o registro do service worker falha (fetch redirecionado para
    // /login vira erro de "unknown error" no navigator.serviceWorker.register()).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|icon.png|apple-icon.png).*)",
  ],
};
