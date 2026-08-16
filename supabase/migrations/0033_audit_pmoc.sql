-- Fase 5 — auditoria: só pmocs. pmoc_work_orders fica fora, mesmo critério
-- já usado para tabelas-filho granulares (preventive_plan_equipment,
-- checklist/measurements/attachments na Fase 4.2).

create trigger trg_audit_pmocs
  after insert or update on public.pmocs
  for each row execute function public.audit_trigger_fn();
