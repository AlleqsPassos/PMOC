-- Fase 4.2 — respostas de checklist dentro de um maintenance_record.
-- template_item_id nullable: null = achado "outro" ad-hoc, criado na hora
-- pelo técnico, sem vínculo com o template. label_snapshot é copiado do
-- template no momento em que o checklist é montado (ou digitado livre no
-- caso do "outro") — preserva o texto mesmo se o template mudar depois.

create table public.maintenance_record_checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  maintenance_record_id uuid not null references public.maintenance_records(id) on delete cascade,
  template_item_id uuid references public.checklist_template_items(id) on delete set null,
  label_snapshot text not null,
  status text not null default 'nao_aplica' check (status in ('ok', 'nao_ok', 'nao_aplica')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.maintenance_record_checklist_items is
  'Resposta de um item de checklist para um equipamento específico da OS. Fora da auditoria por linha — granularidade alta demais, mesmo critério de measurements/attachments.';

create index maintenance_record_checklist_items_record_id_idx on public.maintenance_record_checklist_items (maintenance_record_id);

create trigger trg_maintenance_record_checklist_items_updated_at
  before update on public.maintenance_record_checklist_items
  for each row execute function public.set_updated_at();
