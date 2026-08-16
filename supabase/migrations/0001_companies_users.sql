-- Fundação multi-tenant: companies + users (1:1 com auth.users).
--
-- Nota de design (corrigida durante a implementação em relação ao rascunho
-- original do documento de arquitetura): como users.id É auth.users.id, não
-- é possível pré-criar uma linha "convidada" em `users` antes de o técnico
-- ter uma identidade no Supabase Auth. Por isso não existe status
-- 'invited' aqui — o convite pendente vive inteiramente em `public.invites`
-- (0003) e a linha em `users` só passa a existir, já com status 'active',
-- no momento da ativação (ver função activate_invite em 0006), no mesmo
-- padrão atômico usado por create_company_and_admin para o primeiro admin.
--
-- role_id referencia public.roles, criada em 0002 — a FK é adicionada lá
-- (ordem de dependência: roles não pode vir depois de users referenciá-la
-- sem constraint, e companies/users é conceitualmente a migration "raiz").

create extension if not exists "pgcrypto";

-- Reaproveitada por toda tabela com updated_at deste projeto.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  corporate_name text not null,
  trade_name text,
  cnpj text,
  address jsonb,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.companies is
  'Empresa/tenant raiz. Sem colunas de plano/assinatura no MVP — reservado para o futuro sem exigir migração destrutiva.';

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  role_id uuid not null,
  full_name text not null,
  email text not null,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  invited_by uuid references public.users(id),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'id = auth.users.id sempre. Linhas só são inseridas via create_company_and_admin() ou activate_invite() (SECURITY DEFINER) — nunca diretamente pelo cliente.';

create index users_company_id_idx on public.users (company_id);

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
