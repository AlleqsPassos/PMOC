-- Convite/ativação de Responsável Técnico (seção 8 do briefing / seção 5 da
-- arquitetura). O convite é a ÚNICA representação de um usuário pendente —
-- ver nota de design em 0001_companies_users.sql.

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  code text unique not null,
  full_name text,
  email text,
  status text not null default 'pending'
    check (status in ('pending', 'used', 'expired', 'revoked')),
  created_by uuid not null references public.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by_user_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

comment on table public.invites is
  'full_name/email aqui são só pré-preenchimento no formulário de ativação — não são validados contra o que o técnico informa no signUp. O código por si só é a prova de convite (envio é manual via WhatsApp/e-mail, fora do sistema no MVP).';

create index invites_company_id_idx on public.invites (company_id);
create index invites_code_idx on public.invites (code);
