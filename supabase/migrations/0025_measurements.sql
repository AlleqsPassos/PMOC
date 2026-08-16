-- Fase 4.2 — medições. Tabela de tipos + linhas tipadas (value_numeric/
-- value_text), não JSONB solto nem EAV livre — decisão já registrada na
-- arquitetura (seção 3): facilita agregação para PMOC/dashboards depois,
-- e adicionar um tipo novo é uma linha, não uma migração.
--
-- company_id null = tipo global (seed abaixo); company_id preenchido =
-- tipo específico que uma empresa adicionou ao próprio catálogo.

create table public.measurement_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  key text not null,
  label text not null,
  unit_default text,
  data_type text not null check (data_type in ('numeric', 'text')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.measurement_types is
  'Catálogo de tipos de medição. company_id null = default global (seed). Chave única por empresa e globalmente, via índices parciais abaixo.';

create unique index measurement_types_global_key_idx on public.measurement_types (key) where company_id is null;
create unique index measurement_types_company_key_idx on public.measurement_types (company_id, key) where company_id is not null;

insert into public.measurement_types (key, label, unit_default, data_type) values
  ('temperatura', 'Temperatura', '°C', 'numeric'),
  ('corrente', 'Corrente', 'A', 'numeric'),
  ('tensao', 'Tensão', 'V', 'numeric'),
  ('pressao', 'Pressão', 'psi', 'numeric');

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  maintenance_record_id uuid not null references public.maintenance_records(id) on delete cascade,
  measurement_type_id uuid not null references public.measurement_types(id) on delete restrict,
  value_numeric numeric,
  value_text text,
  unit text,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.measurements is
  'Medição registrada durante a execução. Aditivo, sem disputa (mesma estratégia de conflito da seção 12 da arquitetura) — nunca editada, só criada.';

create index measurements_maintenance_record_id_idx on public.measurements (maintenance_record_id);
create index measurements_company_id_idx on public.measurements (company_id);
