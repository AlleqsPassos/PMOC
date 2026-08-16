-- Fase 4.1 — RLS de work_orders, preventive_plans, preventive_plan_equipment
-- e maintenance_records. Mesmo padrão "Tenant padrão" (seção 9): select só
-- por company_id (permissão de visualização é reforçada na página, não na
-- RLS — mesmo critério já usado em clients/units/equipment/tickets).
--
-- work_orders e maintenance_records aceitam update por `manage_work_orders`
-- OU `execute_work_order` — gerar/reagendar/cancelar é uma ação, executar
-- (mudar status em_andamento/concluída, preencher o laudo) é outra, mesmo
-- padrão de dupla-permissão já usado em tickets_update_same_company.

-- work_orders -----------------------------------------------------------
alter table public.work_orders enable row level security;

create policy "work_orders_select_same_company" on public.work_orders for select
  using (company_id = public.auth_company_id());

create policy "work_orders_insert_same_company" on public.work_orders for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_work_orders'));

create policy "work_orders_update_same_company" on public.work_orders for update
  using (company_id = public.auth_company_id())
  with check (
    company_id = public.auth_company_id()
    and (
      public.has_permission(auth.uid(), 'manage_work_orders')
      or public.has_permission(auth.uid(), 'execute_work_order')
    )
  );

-- preventive_plans --------------------------------------------------------
alter table public.preventive_plans enable row level security;

create policy "preventive_plans_select_same_company" on public.preventive_plans for select
  using (company_id = public.auth_company_id());

create policy "preventive_plans_insert_same_company" on public.preventive_plans for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_preventive_plans'));

create policy "preventive_plans_update_same_company" on public.preventive_plans for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_preventive_plans'));

-- preventive_plan_equipment ------------------------------------------------
alter table public.preventive_plan_equipment enable row level security;

create policy "preventive_plan_equipment_select_same_company" on public.preventive_plan_equipment for select
  using (company_id = public.auth_company_id());

create policy "preventive_plan_equipment_insert_same_company" on public.preventive_plan_equipment for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_preventive_plans'));

-- sem update: vínculo é removido e recriado (insert/delete), não editado.
create policy "preventive_plan_equipment_delete_same_company" on public.preventive_plan_equipment for delete
  using (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_preventive_plans'));

-- maintenance_records -------------------------------------------------------
alter table public.maintenance_records enable row level security;

create policy "maintenance_records_select_same_company" on public.maintenance_records for select
  using (company_id = public.auth_company_id());

create policy "maintenance_records_insert_same_company" on public.maintenance_records for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_work_orders'));

create policy "maintenance_records_update_same_company" on public.maintenance_records for update
  using (company_id = public.auth_company_id())
  with check (
    company_id = public.auth_company_id()
    and (
      public.has_permission(auth.uid(), 'manage_work_orders')
      or public.has_permission(auth.uid(), 'execute_work_order')
    )
  );
