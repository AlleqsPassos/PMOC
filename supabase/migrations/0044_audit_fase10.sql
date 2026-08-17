-- Fase 10 — auditoria do catálogo de peças, trigger genérico de sempre.
-- Medições, respostas de checklist e anexos continuam fora, mesmo critério da
-- Fase 4.2 (0030): granularidade alta demais para auditoria linha a linha.
--
-- A cláusula `when` existe porque `parts_catalog.company_id` é **nullable**
-- (linha global do seed) e `audit_logs.company_id` é NOT NULL: sem o guarda, um
-- insert de linha global derrubaria a transação inteira dentro de
-- `audit_trigger_fn()`. Linha global só entra por migration e não pertence a
-- tenant nenhum, então não há o que auditar nela — a armadilha é para o
-- próximo seed, não para o app (a RLS já obriga company_id nas escritas dele).
create trigger trg_audit_parts_catalog
  after insert or update on public.parts_catalog
  for each row
  when (new.company_id is not null)
  execute function public.audit_trigger_fn();
