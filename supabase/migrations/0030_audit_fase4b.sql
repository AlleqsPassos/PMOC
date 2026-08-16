-- Fase 4.2 — auditoria: só checklist_templates e parts_requests. Respostas
-- de checklist, medições e anexos ficam fora — granularidade alta demais
-- pra auditoria por linha, mesmo critério já usado em preventive_plan_equipment
-- (0022) e documentado na seção 15 do plano desta fase.

create trigger trg_audit_checklist_templates
  after insert or update on public.checklist_templates
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_parts_requests
  after insert or update on public.parts_requests
  for each row execute function public.audit_trigger_fn();
