-- Fase 2 — camadas intermediárias opcionais da hierarquia de uma unidade.
--
-- sectors: agrupamento opcional dentro de uma unidade (ex: "Bloco cirúrgico").
-- environments: onde o equipamento realmente fica (ex: "Sala 3"). sector_id
-- é nullable de propósito — permite Unidade -> Ambiente direto, sem exigir
-- que toda empresa cadastre setores (ver seção 3/4 da arquitetura).

create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  name text not null,
  notes text,
  deleted_at timestamptz,
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sectors is
  'Camada opcional entre unidade e ambiente. Sem status próprio (só ativo/soft-deleted).';

create index sectors_company_id_idx on public.sectors (company_id);
create index sectors_unit_id_idx on public.sectors (unit_id);

create trigger trg_sectors_updated_at
  before update on public.sectors
  for each row execute function public.set_updated_at();

create table public.environments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  sector_id uuid references public.sectors(id) on delete set null,
  name text not null,
  notes text,
  deleted_at timestamptz,
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.environments is
  'Onde o equipamento fica de fato. sector_id nullable: permite Unidade -> Ambiente sem passar por Setor.';

create index environments_company_id_idx on public.environments (company_id);
create index environments_unit_id_idx on public.environments (unit_id);
create index environments_sector_id_idx on public.environments (sector_id);

create trigger trg_environments_updated_at
  before update on public.environments
  for each row execute function public.set_updated_at();
