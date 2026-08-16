-- Fase 4.1 — auditoria de work_orders, preventive_plans e
-- maintenance_records via audit_trigger_fn() (já genérico, 0012). Cobre os
-- 3 objetos de domínio desta sub-fase; preventive_plan_equipment (link) fica
-- de fora, mesmo critério de granularidade já usado para tabelas leaf.

create trigger trg_audit_work_orders
  after insert or update on public.work_orders
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_preventive_plans
  after insert or update on public.preventive_plans
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_maintenance_records
  after insert or update on public.maintenance_records
  for each row execute function public.audit_trigger_fn();
