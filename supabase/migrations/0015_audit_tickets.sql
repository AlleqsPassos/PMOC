-- Fase 3 — auditoria de tickets, reaproveitando audit_trigger_fn() (0012,
-- genérico para qualquer tabela com company_id + id).
--
-- A UI de chamados quer uma "timeline" de status/prioridade (seção 15,
-- Fase 3), mas a policy de select de audit_logs exige `view_audit_log` —
-- permissão de auditoria completa, que RESPONSAVEL_TECNICO não tem (e não
-- deveria ganhar só para ver o histórico dos próprios chamados). Em vez de
-- afrouxar a policy geral de audit_logs, expõe-se uma RPC SECURITY DEFINER
-- estreita: só linhas de entity_type='tickets' do chamado pedido, e exige
-- `view_tickets` (não `view_audit_log`) + mesma empresa.

create trigger trg_audit_tickets
  after insert or update on public.tickets
  for each row execute function public.audit_trigger_fn();

create or replace function public.get_ticket_timeline(p_ticket_id uuid)
returns table (
  id uuid,
  action text,
  previous_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select al.id, al.action, al.previous_data, al.new_data, al.user_id, al.created_at
  from public.audit_logs al
  join public.tickets t on t.id = p_ticket_id
  where al.entity_type = 'tickets'
    and al.entity_id = p_ticket_id
    and t.company_id = public.auth_company_id()
    and public.has_permission(auth.uid(), 'view_tickets')
  order by al.created_at asc;
$$;

comment on function public.get_ticket_timeline(uuid) is
  'Timeline de um chamado (audit_logs filtrado por entity_type=tickets), escopada por empresa + view_tickets — deliberadamente não exige view_audit_log.';
