-- Fase 6 — ledger de idempotência para mutações offline reenviadas (seção
-- 13 da arquitetura). Camada de segurança extra sobre o upsert-por-uuid-
-- gerado-no-cliente (já idempotente por construção): protege contra
-- reaplicação se o mesmo item do outbox for drenado duas vezes (ex: app
-- fechado no meio do drain, retry após reconexão parcial).

create table public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  user_id uuid references public.users(id) on delete set null,
  idempotency_key text not null,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'applied' check (status in ('applied', 'duplicate', 'failed')),
  applied_at timestamptz not null default now()
);

comment on table public.sync_operations is
  'Ledger write-once de mutações offline aplicadas. Unique(idempotency_key) é a defesa contra reaplicação de um item do outbox já drenado.';

create unique index sync_operations_idempotency_key_idx on public.sync_operations (idempotency_key);
create index sync_operations_company_id_idx on public.sync_operations (company_id);
