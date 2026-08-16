-- Fase 4.2 — templates de checklist, configuráveis pelo admin (não
-- hardcoded). Um maintenance_record "responde" um template via
-- maintenance_record_checklist_items (0024) — o item de resposta guarda um
-- snapshot do label, então mudar o template depois não corrompe histórico.

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  maintenance_type text not null check (maintenance_type in ('preventiva', 'corretiva', 'ambos')),
  equipment_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checklist_templates is
  'Template de checklist editável pelo admin. equipment_type é um filtro livre (texto), não FK — não há catálogo fixo de tipos de equipamento.';

create index checklist_templates_company_id_idx on public.checklist_templates (company_id);

create trigger trg_checklist_templates_updated_at
  before update on public.checklist_templates
  for each row execute function public.set_updated_at();

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade,
  label text not null,
  order_index integer not null default 0,
  is_required boolean not null default true,
  allows_other boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.checklist_template_items is
  'Item de um template. allows_other marca o item "outro" que permite achado ad-hoc na execução.';

create index checklist_template_items_template_id_idx on public.checklist_template_items (checklist_template_id);
