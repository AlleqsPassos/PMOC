-- Fase 5 — RLS de pmocs/pmoc_work_orders. Mesmo padrão "Tenant padrão":
-- select por company_id; insert/update exigem generate_pmoc (permissão já
-- existe desde o seed da Fase 1). Sem policy de delete em nenhuma das duas
-- — pmoc_work_orders é write-once (rastreabilidade), pmocs nunca é apagado.

alter table public.pmocs enable row level security;

create policy "pmocs_select_same_company" on public.pmocs for select
  using (company_id = public.auth_company_id());

create policy "pmocs_insert_same_company" on public.pmocs for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'generate_pmoc'));

create policy "pmocs_update_same_company" on public.pmocs for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'generate_pmoc'));

alter table public.pmoc_work_orders enable row level security;

create policy "pmoc_work_orders_select_same_company" on public.pmoc_work_orders for select
  using (company_id = public.auth_company_id());

create policy "pmoc_work_orders_insert_same_company" on public.pmoc_work_orders for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'generate_pmoc'));
