-- Funções centrais de multi-tenancy/autorização + RLS para as tabelas de
-- fundação (companies, users, roles, permissions, role_permissions,
-- user_permissions, invites). Tabelas de domínio (clients, units,
-- equipment, tickets, ...) repetem este mesmo padrão a partir da Fase 2.

create or replace function public.auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid()
$$;

comment on function public.auth_company_id() is
  'security definer evita recursão de RLS quando chamada de dentro de uma policy em users. Se custo por request importar em escala, trocar por claim no JWT sem mudar a forma de nenhuma policy.';

create or replace function public.has_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select up.granted
       from public.user_permissions up
       join public.permissions p on p.id = up.permission_id
      where up.user_id = p_user_id and p.key = p_permission_key),
    (select true
       from public.role_permissions rp
       join public.permissions p on p.id = rp.permission_id
       join public.users u on u.role_id = rp.role_id
      where u.id = p_user_id and p.key = p_permission_key),
    false
  );
$$;

comment on function public.has_permission(uuid, text) is
  'Precedência: override explícito em user_permissions (allow ou revoke) > default do papel > deny.';

-- companies -------------------------------------------------------------
alter table public.companies enable row level security;

create policy "companies_select_own" on public.companies for select
  using (id = public.auth_company_id());
-- Sem insert/update/delete: linha só é criada via create_company_and_admin()
-- (SECURITY DEFINER, ver 0006), que roda com privilégios do dono da função
-- e portanto ignora RLS.

-- users -------------------------------------------------------------------
alter table public.users enable row level security;

create policy "users_select_same_company" on public.users for select
  using (company_id = public.auth_company_id());

create policy "users_update_self" on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users_update_by_admin" on public.users for update
  using (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_users'))
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_users'));

-- RLS não restringe colunas individualmente (só linhas) — um técnico com
-- policy "users_update_self" tecnicamente poderia tentar mudar seu próprio
-- role_id/status. Este trigger fecha essa lacuna independentemente de quem
-- fez a query passar pela policy.
create or replace function public.enforce_user_role_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role_id is distinct from old.role_id or new.status is distinct from old.status)
     and not public.has_permission(auth.uid(), 'manage_users') then
    raise exception 'Apenas usuários com a permissão manage_users podem alterar role_id/status.';
  end if;
  return new;
end;
$$;

create trigger trg_users_role_status_guard
  before update on public.users
  for each row execute function public.enforce_user_role_status_change();

-- roles / permissions (catálogos globais) ---------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;

create policy "roles_select_authenticated" on public.roles for select
  using (auth.uid() is not null);

create policy "permissions_select_authenticated" on public.permissions for select
  using (auth.uid() is not null);
-- Sem policy de write: catálogo gerenciado por migration (roda como
-- postgres, ignora RLS).

-- role_permissions ---------------------------------------------------------
alter table public.role_permissions enable row level security;

create policy "role_permissions_select_authenticated" on public.role_permissions for select
  using (auth.uid() is not null);

create policy "role_permissions_write_manage_permissions" on public.role_permissions for all
  using (public.has_permission(auth.uid(), 'manage_permissions'))
  with check (public.has_permission(auth.uid(), 'manage_permissions'));

-- user_permissions -----------------------------------------------------------
alter table public.user_permissions enable row level security;

create policy "user_permissions_select_same_company" on public.user_permissions for select
  using (
    exists (
      select 1 from public.users u
      where u.id = user_permissions.user_id
        and u.company_id = public.auth_company_id()
    )
  );

create policy "user_permissions_write_same_company" on public.user_permissions for all
  using (
    exists (
      select 1 from public.users u
      where u.id = user_permissions.user_id
        and u.company_id = public.auth_company_id()
    )
    and public.has_permission(auth.uid(), 'manage_permissions')
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = user_permissions.user_id
        and u.company_id = public.auth_company_id()
    )
    and public.has_permission(auth.uid(), 'manage_permissions')
  );

-- invites -------------------------------------------------------------------
alter table public.invites enable row level security;

create policy "invites_all_same_company_admin" on public.invites for all
  using (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_users'))
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_users'));
-- Validação do código no momento da ativação (usuário ainda sem sessão
-- válida na empresa) passa por activate_invite() (SECURITY DEFINER, 0006),
-- não por acesso direto à tabela — por isso não há policy de select anônima.
