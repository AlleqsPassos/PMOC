-- Fase 2 — unidades físicas de um cliente (ex: os 4 prédios do hospital).
-- deleted_at real aqui (diferente de clients) porque units é referenciada
-- por equipamentos/setores/ambientes com histórico operacional pendurado.

create table public.units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  address jsonb,
  responsible_name text,
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  deleted_at timestamptz,
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.units is
  'Unidade física de um cliente. "Excluir" na aplicação é update setando deleted_at/deleted_by — nunca delete real (ver estratégia de auditoria/soft-delete da arquitetura).';

create index units_company_id_idx on public.units (company_id);
create index units_client_id_idx on public.units (client_id);

create trigger trg_units_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();
