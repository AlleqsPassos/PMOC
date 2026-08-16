-- RPCs SECURITY DEFINER que materializam o fluxo de auth da seção 5 da
-- arquitetura. Não fazem parte da lista original de 0001-0005 do documento
-- de plano — adicionadas aqui porque a Fase 1 (passos 10 e 11) exige essas
-- duas funções para os fluxos de criação de empresa e ativação de convite.
--
-- Ambas rodam com privilégio do dono da função (postgres), ignorando RLS
-- deliberadamente — são o único caminho para inserir em public.companies e
-- public.users a partir do client. auth.uid() = p_user_id é sempre
-- verificado explicitamente para não virar uma porta aberta.

create or replace function public.create_company_and_admin(
  p_user_id uuid,
  p_corporate_name text,
  p_trade_name text,
  p_cnpj text,
  p_email text,
  p_full_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_admin_role_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Não autorizado.';
  end if;

  if exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Usuário já vinculado a uma empresa.';
  end if;

  select id into v_admin_role_id from public.roles where key = 'ADMINISTRADOR';

  insert into public.companies (corporate_name, trade_name, cnpj, email)
  values (p_corporate_name, p_trade_name, p_cnpj, p_email)
  returning id into v_company_id;

  insert into public.users (id, company_id, role_id, full_name, email, status, activated_at)
  values (p_user_id, v_company_id, v_admin_role_id, p_full_name, p_email, 'active', now());

  return v_company_id;
end;
$$;

comment on function public.create_company_and_admin(uuid, text, text, text, text, text) is
  'Chamada pela Server Action /criar-empresa logo após auth.signUp() (sessão já existe, auth.uid() = p_user_id). Cria companies + users(role=ADMINISTRADOR) atomicamente.';

grant execute on function public.create_company_and_admin(uuid, text, text, text, text, text) to authenticated;


create or replace function public.activate_invite(
  p_code text,
  p_user_id uuid,
  p_full_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Não autorizado.';
  end if;

  if exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Usuário já vinculado a uma empresa.';
  end if;

  select * into v_invite
  from public.invites
  where code = p_code
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  insert into public.users (id, company_id, role_id, full_name, email, status, invited_by, activated_at)
  values (
    p_user_id,
    v_invite.company_id,
    v_invite.role_id,
    coalesce(nullif(trim(p_full_name), ''), v_invite.full_name, ''),
    coalesce(v_invite.email, (select email from auth.users where id = p_user_id)),
    'active',
    v_invite.created_by,
    now()
  );

  update public.invites
  set status = 'used', used_at = now(), used_by_user_id = p_user_id
  where id = v_invite.id;

  return v_invite.company_id;
end;
$$;

comment on function public.activate_invite(text, uuid, text) is
  'Chamada pela Server Action /ativar-convite/[code] logo após auth.signUp() do técnico. code é a única prova de convite exigida (sem checagem de e-mail — envio é manual/fora do sistema no MVP).';

grant execute on function public.activate_invite(text, uuid, text) to authenticated;
