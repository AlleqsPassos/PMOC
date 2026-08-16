-- Fase 7 — fecha a dívida documentada desde 0012_audit_logs.sql: retrofit do
-- trigger de auditoria em companies/users/invites (só captura de dados,
-- ausente até aqui) + ajustes de schema que a UI de /auditoria precisa.

-- FK real em user_id: até aqui era um uuid solto (sem "references"), o que
-- impede o embedded select do PostgREST (`user:users(full_name)`) que a tela
-- de auditoria precisa pra mostrar o ator de cada evento. Aditivo e seguro —
-- on delete set null preserva a linha do log mesmo se o usuário for removido
-- no futuro (hoje não há delete real de usuário, mas não custa a garantia).
alter table public.audit_logs
  add constraint audit_logs_user_id_fkey foreign key (user_id) references public.users(id) on delete set null;

-- A listagem pagina por company_id e ordena por created_at desc; só havia
-- índice em (company_id) e (entity_type, entity_id) até aqui.
create index audit_logs_company_created_idx on public.audit_logs (company_id, created_at desc);

-- audit_trigger_fn() genérica (0012) assume NEW.company_id — companies não
-- tem essa coluna (é a raiz do tenant, a própria empresa). Variante mínima
-- que usa o próprio id como company_id do log, em vez de tocar na função
-- genérica (usada por 10+ tabelas).
create or replace function public.audit_trigger_fn_companies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    company_id, user_id, action, entity_type, entity_id, previous_data, new_data, source
  ) values (
    coalesce(new.id, old.id),
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    'web'
  );

  return coalesce(new, old);
end;
$$;

comment on function public.audit_trigger_fn_companies() is
  'Variante de audit_trigger_fn() só para companies, que não tem coluna company_id própria.';

create trigger trg_audit_companies
  after insert or update on public.companies
  for each row execute function public.audit_trigger_fn_companies();

-- users e invites já têm id + company_id — a função genérica serve direto.
-- Cobre automaticamente create_company_and_admin() (INSERT em users),
-- activate_invite() (INSERT em users, UPDATE em invites) e emissão/revogação
-- de convite (INSERT/UPDATE em invites) sem precisar de captura manual em
-- código de aplicação: trigger dispara independente de a escrita vir de RPC
-- SECURITY DEFINER ou de DML direto.
create trigger trg_audit_users
  after insert or update on public.users
  for each row execute function public.audit_trigger_fn();

create trigger trg_audit_invites
  after insert or update on public.invites
  for each row execute function public.audit_trigger_fn();
