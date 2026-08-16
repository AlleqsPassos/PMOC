-- Fase 5 — PMOC: consolidação por cliente/período das OS concluídas em
-- todas as unidades do cliente, num PDF único. `pmoc_work_orders` é só
-- rastreabilidade (quais OS entraram), preenchida automaticamente pela
-- Server Action de geração — não há seleção manual.
--
-- Decisão de fluxo: toda linha de `pmocs` nasce já com status='generated'
-- (o PDF é montado em memória e só grava no banco depois do upload pro
-- Storage ter sucesso — nunca existe um 'draft' órfão). A coluna 'draft'
-- fica no schema por fidelidade à arquitetura documentada, mas nenhum
-- caminho de código desta fase a alcança.

create table public.pmocs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'generated')),
  pdf_storage_path text,
  generated_by uuid references public.users(id) on delete set null,
  generated_at timestamptz,
  -- Campos de extensão futura (seção 3 da arquitetura) — nullable, em
  -- branco nesta fase, reservados pra não exigir migração destrutiva
  -- quando responsável técnico/ART/assinatura entrarem em escopo.
  responsible_technician_name text,
  professional_registry text,
  art_number text,
  signature_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pmocs is
  'PMOC consolidado por cliente/período. Nasce já status=generated — ver nota de fluxo acima.';

create index pmocs_company_id_idx on public.pmocs (company_id);
create index pmocs_client_id_idx on public.pmocs (client_id);

create trigger trg_pmocs_updated_at
  before update on public.pmocs
  for each row execute function public.set_updated_at();

create table public.pmoc_work_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  pmoc_id uuid not null references public.pmocs(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.pmoc_work_orders is
  'Rastreabilidade: quais OS entraram em qual PMOC consolidado. Write-once, sem update/delete.';

create index pmoc_work_orders_pmoc_id_idx on public.pmoc_work_orders (pmoc_id);
create index pmoc_work_orders_work_order_id_idx on public.pmoc_work_orders (work_order_id);

-- Bucket privado + policies de storage.objects, mesmo padrão de
-- 0026_attachments.sql. Path: company/{company_id}/pmoc/{pmoc_id}/{filename}.pdf
-- — o segmento [2] é o limite de isolamento no storage.
insert into storage.buckets (id, name, public)
values ('pmoc-pdfs', 'pmoc-pdfs', false)
on conflict (id) do nothing;

create policy "pmoc_pdfs_storage_select_same_company" on storage.objects for select
  using (bucket_id = 'pmoc-pdfs' and (storage.foldername(name))[2] = public.auth_company_id()::text);

create policy "pmoc_pdfs_storage_insert_same_company" on storage.objects for insert
  with check (bucket_id = 'pmoc-pdfs' and (storage.foldername(name))[2] = public.auth_company_id()::text);
