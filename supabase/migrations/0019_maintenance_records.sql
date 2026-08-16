-- Fase 4.1 — maintenance_records: um por equipamento dentro de uma OS. É o
-- "laudo" — não existe tabela separada pra isso, é o conjunto de campos
-- narrativos aqui (seção 3 da arquitetura). Criado em lote quando a OS é
-- gerada (generateWorkOrderFromTicket/FromPreventivePlan); preenchido
-- depois pelo técnico no fluxo de atendimento (Fase 4.2), daí o status
-- draft/completed permitir retomar salvamento incremental.

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  technician_user_id uuid references public.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  cause_identified text,
  service_performed text,
  recommendation text,
  diagnosis text,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.maintenance_records is
  'Um registro por equipamento coberto pela OS — o laudo. Checklist (Fase 4.2), medições e fotos penduram aqui via FK.';

create index maintenance_records_company_id_idx on public.maintenance_records (company_id);
create index maintenance_records_work_order_id_idx on public.maintenance_records (work_order_id);
create index maintenance_records_equipment_id_idx on public.maintenance_records (equipment_id);
create index maintenance_records_technician_user_id_idx on public.maintenance_records (technician_user_id);

create trigger trg_maintenance_records_updated_at
  before update on public.maintenance_records
  for each row execute function public.set_updated_at();
