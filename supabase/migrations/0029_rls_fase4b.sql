-- Fase 4.2 — RLS das tabelas de execução (checklist, medições, anexos,
-- peças). Mesmo padrão "Tenant padrão": select por company_id, sem gate de
-- permissão (reforçada na página). Tabelas de execução propriamente ditas
-- (respostas de checklist, medições, anexos) aceitam insert por
-- `execute_work_order` OU `manage_work_orders` — mesmo critério de
-- work_orders/maintenance_records (0021).

-- checklist_templates -----------------------------------------------------
alter table public.checklist_templates enable row level security;

create policy "checklist_templates_select_same_company" on public.checklist_templates for select
  using (company_id = public.auth_company_id());

create policy "checklist_templates_insert_same_company" on public.checklist_templates for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_checklist_templates'));

create policy "checklist_templates_update_same_company" on public.checklist_templates for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_checklist_templates'));

-- checklist_template_items -------------------------------------------------
alter table public.checklist_template_items enable row level security;

create policy "checklist_template_items_select_same_company" on public.checklist_template_items for select
  using (company_id = public.auth_company_id());

create policy "checklist_template_items_insert_same_company" on public.checklist_template_items for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_checklist_templates'));

create policy "checklist_template_items_update_same_company" on public.checklist_template_items for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_checklist_templates'));

create policy "checklist_template_items_delete_same_company" on public.checklist_template_items for delete
  using (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_checklist_templates'));

-- maintenance_record_checklist_items ----------------------------------------
alter table public.maintenance_record_checklist_items enable row level security;

create policy "maintenance_record_checklist_items_select_same_company" on public.maintenance_record_checklist_items for select
  using (company_id = public.auth_company_id());

create policy "maintenance_record_checklist_items_insert_same_company" on public.maintenance_record_checklist_items for insert
  with check (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );

create policy "maintenance_record_checklist_items_update_same_company" on public.maintenance_record_checklist_items for update
  using (company_id = public.auth_company_id())
  with check (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );

-- measurement_types ---------------------------------------------------------
alter table public.measurement_types enable row level security;

-- select enxerga o catálogo global (company_id null) + o da própria empresa.
create policy "measurement_types_select_same_company_or_global" on public.measurement_types for select
  using (company_id = public.auth_company_id() or company_id is null);

create policy "measurement_types_insert_same_company" on public.measurement_types for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_measurement_types'));

create policy "measurement_types_update_same_company" on public.measurement_types for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_measurement_types'));

-- measurements ----------------------------------------------------------------
alter table public.measurements enable row level security;

create policy "measurements_select_same_company" on public.measurements for select
  using (company_id = public.auth_company_id());

create policy "measurements_insert_same_company" on public.measurements for insert
  with check (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );
-- sem update/delete: medição é aditiva, nunca editada (seção 12 da arquitetura).

-- attachments -------------------------------------------------------------
alter table public.attachments enable row level security;

create policy "attachments_select_same_company" on public.attachments for select
  using (company_id = public.auth_company_id());

create policy "attachments_insert_same_company" on public.attachments for insert
  with check (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );
-- sem update/delete: reenviar na mesma categoria é o caminho pra corrigir.

-- parts_requests ------------------------------------------------------------
alter table public.parts_requests enable row level security;

create policy "parts_requests_select_same_company" on public.parts_requests for select
  using (company_id = public.auth_company_id());

create policy "parts_requests_insert_same_company" on public.parts_requests for insert
  with check (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );

-- update (mudar status) é fluxo administrativo — só manage_parts_requests,
-- sem dupla-permissão com execute_work_order (diferente de work_orders):
-- o técnico cria a solicitação, mas não avança o status dela.
create policy "parts_requests_update_same_company" on public.parts_requests for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_parts_requests'));
