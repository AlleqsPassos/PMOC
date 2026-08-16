-- Fase 2 — clientes (topo da hierarquia física: cliente > unidade > setor?
-- > ambiente > equipamento). Sem deleted_at: "excluir" um cliente é
-- inativá-lo via status, mesmo padrão de public.companies.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  corporate_name text not null,
  trade_name text,
  cnpj text,
  address jsonb,
  phone text,
  email text,
  responsible_name text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clients is
  'Cliente da empresa de manutenção (ex: hospital atendido). Sem deleted_at por design — status active/inactive é suficiente aqui, igual companies.';

create index clients_company_id_idx on public.clients (company_id);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
