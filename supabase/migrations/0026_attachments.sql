-- Fase 4.2 — anexos (fotos). Metadados aqui; o binário vive no bucket
-- Storage `attachments`, path `company/{company_id}/work-orders/{work_order_id}/{category}/{uuid}.{ext}`
-- (seção 10 da arquitetura). Limite de 2 fotos/categoria é validado na
-- Server Action de upload, não como constraint de banco.

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  maintenance_record_id uuid references public.maintenance_records(id) on delete set null,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  category text not null check (category in ('equipamento', 'etiqueta', 'problema', 'antes', 'depois', 'outro')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.attachments is
  'Metadados de foto — o arquivo em si vive no bucket Storage attachments. Sem update/delete: reenviar na mesma categoria até o limite é o caminho pra corrigir um upload errado.';

create index attachments_work_order_id_idx on public.attachments (work_order_id);
create index attachments_maintenance_record_id_idx on public.attachments (maintenance_record_id);
create index attachments_equipment_id_idx on public.attachments (equipment_id);

-- Bucket privado + policies de storage.objects. O segmento [2] do path
-- (company/{company_id}/...) é o limite de isolamento no storage; a linha
-- em attachments acima (com FK real) é a fonte de verdade pra checagens
-- mais finas, feitas na Server Action de upload antes de gerar o path.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_storage_select_same_company" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[2] = public.auth_company_id()::text);

create policy "attachments_storage_insert_same_company" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[2] = public.auth_company_id()::text);
