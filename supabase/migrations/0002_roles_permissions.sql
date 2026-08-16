-- Catálogos globais de papéis e permissões, e as tabelas de associação.
-- Papel ≠ Permissão (seção 7 do documento de arquitetura): role_permissions
-- guarda o default por papel; user_permissions guarda overrides explícitos
-- por usuário (allow OU revoke), que sempre têm precedência.

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.roles is
  'Catálogo global, não por empresa. is_system reserva espaço para papéis futuros (Técnico, Supervisor, Almoxarifado) sem mudar a forma da tabela.';

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  category text not null,
  created_at timestamptz not null default now()
);

comment on table public.permissions is 'Catálogo global de permissões granulares.';

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_permissions (
  user_id uuid not null references public.users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  granted boolean not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

comment on table public.user_permissions is
  'Override explícito por usuário. granted=true força allow, granted=false força revoke — ambos sobrepõem o default de role_permissions. Ver função has_permission() em 0004.';

-- Agora que roles existe, conecta a FK pendente de 0001.
alter table public.users
  add constraint users_role_id_fkey foreign key (role_id) references public.roles(id);
