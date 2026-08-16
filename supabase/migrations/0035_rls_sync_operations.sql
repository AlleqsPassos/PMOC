-- Fase 6 — RLS de sync_operations. Infraestrutura de sync, não dado de
-- negócio — select/insert por company_id, sem gate de permissão extra
-- (qualquer usuário autenticado da empresa pode gravar seu próprio
-- progresso de sync). Sem update/delete: ledger write-once.

alter table public.sync_operations enable row level security;

create policy "sync_operations_select_same_company" on public.sync_operations for select
  using (company_id = public.auth_company_id());

create policy "sync_operations_insert_same_company" on public.sync_operations for insert
  with check (company_id = public.auth_company_id());
