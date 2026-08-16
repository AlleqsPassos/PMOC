-- Fase 7.2 — captura de auditoria pra mudanças em user_permissions.
--
-- audit_logs não tem policy de insert pro cliente (0012_audit_logs.sql: "Sem
-- policy de insert/update/delete para o cliente: linhas só entram via
-- audit_trigger_fn()"). user_permissions não pode usar essa trigger genérica
-- (PK composta, sem coluna id — audit_trigger_fn() assume NEW.id). Esta RPC
-- SECURITY DEFINER é o caminho seguro equivalente: revalida manage_permissions
-- e que o usuário-alvo é da mesma empresa do ator antes de gravar, e é a
-- única forma da aplicação conseguir inserir em audit_logs fora da trigger.
create or replace function public.log_permission_change(
  p_user_id uuid,
  p_permission_key text,
  p_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_target_company_id uuid;
  v_action text;
begin
  if not public.has_permission(v_actor, 'manage_permissions') then
    raise exception 'Permissão negada: manage_permissions';
  end if;

  select company_id into v_target_company_id from public.users where id = p_user_id;
  if v_target_company_id is null or v_target_company_id != public.auth_company_id() then
    raise exception 'Usuário-alvo inválido ou de outra empresa';
  end if;

  v_action := case p_mode
    when 'allow' then 'grant_permission'
    when 'deny' then 'revoke_permission'
    else 'reset_permission'
  end;

  insert into public.audit_logs (company_id, user_id, action, entity_type, entity_id, new_data, source)
  values (
    v_target_company_id,
    v_actor,
    v_action,
    'user_permissions',
    p_user_id,
    jsonb_build_object('permission_key', p_permission_key, 'mode', p_mode),
    'web'
  );
end;
$$;

comment on function public.log_permission_change(uuid, text, text) is
  'Captura de auditoria em camada de aplicação pra user_permissions — não tem id próprio pro trigger genérico usar. Chamada por setUserPermissionOverride() (features/permissions/actions.ts).';
