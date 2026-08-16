-- Fase 3 — RLS de tickets. Mesmo padrão de 0011_rls_operational.sql, com
-- uma diferença: o update aceita `edit_tickets` OU `assign_tickets`, porque
-- são ações distintas na aplicação (editar dados do chamado vs. atribuir
-- técnico) que hoje coincidem nos mesmos papéis mas são catalogadas como
-- permissões separadas desde a Fase 1 — a policy não deve amarrar as duas.

alter table public.tickets enable row level security;

create policy "tickets_select_same_company" on public.tickets for select
  using (company_id = public.auth_company_id());

create policy "tickets_insert_same_company" on public.tickets for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_tickets'));

create policy "tickets_update_same_company" on public.tickets for update
  using (company_id = public.auth_company_id())
  with check (
    company_id = public.auth_company_id()
    and (
      public.has_permission(auth.uid(), 'edit_tickets')
      or public.has_permission(auth.uid(), 'assign_tickets')
    )
  );
