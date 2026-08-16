-- Fase 4.1 — planos preventivos: agenda recorrente por cliente/unidade que
-- agrupa um conjunto de equipamentos. Cada execução do plano gera uma OS
-- preventiva (work_orders.origin_preventive_plan_id).
--
-- Sem deleted_at — segue o padrão de `clients`: "excluir" é inativar via
-- status.

create table public.preventive_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  periodicity text not null check (periodicity in (
    'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral',
    'semestral', 'anual', 'personalizada'
  )),
  assigned_user_id uuid references public.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.preventive_plans is
  'Agenda recorrente de manutenção preventiva. Sem deleted_at por design, mesmo padrão de clients.';

create index preventive_plans_company_id_idx on public.preventive_plans (company_id);
create index preventive_plans_unit_id_idx on public.preventive_plans (unit_id);

create trigger trg_preventive_plans_updated_at
  before update on public.preventive_plans
  for each row execute function public.set_updated_at();

create table public.preventive_plan_equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  preventive_plan_id uuid not null references public.preventive_plans(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (preventive_plan_id, equipment_id)
);

comment on table public.preventive_plan_equipment is
  'N:N plano preventivo <-> equipamentos cobertos. company_id denormalizado, mesmo padrão de sempre — RLS plana sem join.';

create index preventive_plan_equipment_plan_id_idx on public.preventive_plan_equipment (preventive_plan_id);
create index preventive_plan_equipment_equipment_id_idx on public.preventive_plan_equipment (equipment_id);

-- Endurece a FK que 0016_work_orders.sql deixou reservada.
alter table public.work_orders
  add constraint work_orders_origin_preventive_plan_id_fkey
  foreign key (origin_preventive_plan_id) references public.preventive_plans(id) on delete set null;

create index work_orders_origin_preventive_plan_id_idx on public.work_orders (origin_preventive_plan_id);
