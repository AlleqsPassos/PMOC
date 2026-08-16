# PMOC+

SaaS multi-tenant (web/PWA) para empresas de manutenção de climatização gerenciarem operação de campo (clientes, unidades, equipamentos, chamados, ordens de serviço, preventivas) e gerarem documentação de PMOC (Plano de Manutenção, Operação e Controle).

A arquitetura completa — entidades, RLS, permissões, decisões de offline-first, plano de fases e status atual do projeto — está documentada em **[docs/arquitetura.md](docs/arquitetura.md)**. Leia esse arquivo antes de mexer em qualquer coisa relacionada a schema, RLS ou multi-tenancy.

## Stack

Next.js 16 (App Router, Webpack — Serwist ainda não suporta Turbopack) + React 19 + TypeScript + Tailwind v4 + shadcn/ui, Supabase (Postgres/Auth/Storage) com Row Level Security, PWA via Serwist.

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # preencher com as credenciais do projeto Supabase
npm run dev
```

Abre em `http://localhost:3000`.

### Banco de dados

O schema vive em `supabase/migrations/*.sql`, numerado sequencialmente. O projeto Supabase não está linkado via CLI (`supabase link`) — para aplicar migrations novas, gere o arquivo combinado e cole no SQL Editor do dashboard Supabase:

```bash
cat supabase/migrations/000N_*.sql > supabase/migrations_combined.sql
```

(`migrations_combined.sql` é gitignored — é só um artefato de conveniência para colar, a fonte de verdade é sempre `supabase/migrations/`.)

Depois de aplicar migrations que criam/alteram tabelas, atualize `src/types/database.types.ts` à mão (ver comentário no topo do arquivo — inclui `Relationships` reais, exigido pelo parser de tipos do `@supabase/postgrest-js` para joins embutidos tiparem corretamente).

### Rotas dinâmicas / `PageProps`

Depois de criar uma rota nova com parâmetro (`[id]`), rode `npx next typegen` para gerar o tipo `PageProps<'/rota/[id]'>` usado nas páginas.

## Build e lint

```bash
npm run build --webpack
npm run lint
```

Ambos devem terminar sem erros antes de qualquer commit.

## Deploy

Ainda não feito (adiado). Ver seção "Status atual" em [docs/arquitetura.md](docs/arquitetura.md).
