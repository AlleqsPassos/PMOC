-- Fase 2 — auditoria (seção 14 da arquitetura). Cobre só os 5 cadastros
-- desta fase (clients/units/sectors/environments/equipment); retrofit em
-- companies/users/invites e a UI de visualização (/auditoria) ficam para
-- fases posteriores (Fase 7 no documento) — captura de dados só.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_data jsonb,
  new_data jsonb,
  source text not null default 'web' check (source in ('web', 'system')),
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Somente inserção — nenhuma policy de update/delete para nenhum papel. Sem FK rígida em entity_type/entity_id: log é propositalmente polimórfico.';

create index audit_logs_company_id_idx on public.audit_logs (company_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_same_company" on public.audit_logs for select
  using (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'view_audit_log'));
-- Sem policy de insert/update/delete para o cliente: linhas só entram via
-- audit_trigger_fn() (SECURITY DEFINER, abaixo), que ignora RLS.

-- Trigger genérico ------------------------------------------------------------
create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  v_company_id := coalesce(new.company_id, old.company_id);

  insert into public.audit_logs (
    company_id, user_id, action, entity_type, entity_id, previous_data, new_data, source
  ) values (
    v_company_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    'web'
  );

  return coalesce(new, old);
end;
$$;

comment on function public.audit_trigger_fn() is
  'Genérico para qualquer tabela com company_id + id. DELETE real não acontece nas tabelas desta fase (tudo é soft-delete via UPDATE), mas o caminho fica pronto caso alguma tabela futura precise.';

create trigger trg_audit_clients
  after insert or update on public.clients
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_units
  after insert or update on public.units
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_sectors
  after insert or update on public.sectors
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_environments
  after insert or update on public.environments
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_equipment
  after insert or update on public.equipment
  for each row execute function public.audit_trigger_fn();
