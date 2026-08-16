-- Fase 2 — equipamentos climatizados, a folha da hierarquia física e o
-- objeto em torno do qual chamados/OS/PMOC (Fases 3-5) vão girar.
--
-- tag é único por empresa (não globalmente) — string estruturada digitada
-- pelo admin, "QR-ready" mas sem geração/leitura de QR no MVP (fora de
-- escopo, ver seção "out of scope" do briefing).
--
-- status é um enum próprio (operacional/atencao/em_manutencao/inativo),
-- diferente do active/inactive de clients/units — é o que a Fase 2 chama
-- de "gestão de status de equipamento".

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  sector_id uuid references public.sectors(id) on delete set null,
  environment_id uuid not null references public.environments(id) on delete restrict,
  tag text not null,
  type text,
  brand text,
  model text,
  serial_number text,
  capacity_btu numeric,
  refrigerant text,
  voltage text,
  status text not null default 'operacional'
    check (status in ('operacional', 'atencao', 'em_manutencao', 'inativo')),
  notes text,
  deleted_at timestamptz,
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, tag)
);

comment on table public.equipment is
  'Folha da hierarquia física. Histórico de manutenção (Fase 4) e consolidação de PMOC (Fase 5) apontam para cá.';

create index equipment_company_id_idx on public.equipment (company_id);
create index equipment_unit_id_idx on public.equipment (unit_id);
create index equipment_sector_id_idx on public.equipment (sector_id);
create index equipment_environment_id_idx on public.equipment (environment_id);

create trigger trg_equipment_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();
