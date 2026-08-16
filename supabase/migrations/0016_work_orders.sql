-- Fase 4.1 — ordens de serviço (OS). Objeto que agrupa o trabalho de campo:
-- nasce de um chamado (corretiva) ou de uma preventiva (preventiva,
-- agrupando vários equipamentos). `origin_preventive_plan_id` fica como
-- uuid solto por enquanto — a FK é endurecida em 0018, quando
-- `preventive_plans` passa a existir (mesmo truque já usado com
-- `tickets.work_order_id` na Fase 3, ver 0017).
--
-- Sem deleted_at: "cancelar" uma OS é um status do próprio workflow.

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  type text not null check (type in ('corretiva', 'preventiva')),
  origin_ticket_id uuid references public.tickets(id) on delete set null,
  origin_preventive_plan_id uuid,
  title text not null,
  status text not null default 'aberta'
    check (status in ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  assigned_user_id uuid references public.users(id) on delete set null,
  scheduled_date date,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.work_orders is
  'Ordem de serviço — agrupa maintenance_records (um por equipamento). origin_preventive_plan_id sem FK até 0018_preventive_plans.sql criar a tabela.';

create index work_orders_company_id_idx on public.work_orders (company_id);
create index work_orders_unit_id_idx on public.work_orders (unit_id);
create index work_orders_origin_ticket_id_idx on public.work_orders (origin_ticket_id);
create index work_orders_assigned_user_id_idx on public.work_orders (assigned_user_id);
create index work_orders_status_idx on public.work_orders (status);

create trigger trg_work_orders_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();
