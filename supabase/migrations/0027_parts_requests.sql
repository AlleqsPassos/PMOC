-- Fase 4.2 — solicitação de peças. Criada pelo técnico durante a execução,
-- status gerenciado pelo admin depois (fluxo administrativo, seção 15).

create table public.parts_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  maintenance_record_id uuid references public.maintenance_records(id) on delete set null,
  requested_by_user_id uuid not null references public.users(id),
  part_name text not null,
  quantity integer not null default 1,
  note text,
  status text not null default 'Solicitada'
    check (status in ('Solicitada', 'Em andamento', 'Aguardando', 'Resolvida', 'Cancelada')),
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.parts_requests is
  'Solicitação de peça aberta pelo técnico durante a execução; status avançado pelo admin (manage_parts_requests).';

create index parts_requests_work_order_id_idx on public.parts_requests (work_order_id);
create index parts_requests_company_id_idx on public.parts_requests (company_id);
create index parts_requests_status_idx on public.parts_requests (status);

create trigger trg_parts_requests_updated_at
  before update on public.parts_requests
  for each row execute function public.set_updated_at();
