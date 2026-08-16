-- Fase 3 — chamados. Primeira entidade de "operação" propriamente dita:
-- reporta um problema num cliente/unidade, opcionalmente localizado até
-- setor/ambiente/equipamento, e segue um workflow de status até virar OS
-- (Fase 4) ou ser cancelado.
--
-- Sem deleted_at por design (ver seção 3 da arquitetura): "excluir" um
-- chamado é levá-lo a status='cancelado', que é um estado do próprio
-- workflow, não uma exclusão lógica separada.
--
-- work_order_id fica reservado (nullable, sem FK ainda) para a Fase 4, que
-- introduz public.work_orders — adicionar a FK então é migração aditiva,
-- não-destrutiva (mesmo padrão já usado em pmocs/campos de extensão futura).

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  sector_id uuid references public.sectors(id) on delete set null,
  environment_id uuid references public.environments(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'media'
    check (priority in ('urgente', 'alta', 'media', 'baixa')),
  status text not null default 'aberto'
    check (status in (
      'aberto', 'designado', 'em_atendimento', 'aguardando_peca',
      'aguardando_cliente', 'concluido', 'cancelado'
    )),
  assigned_user_id uuid references public.users(id) on delete set null,
  opened_by_user_id uuid not null references public.users(id),
  opened_at timestamptz not null default now(),
  work_order_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tickets is
  'Chamado (ocorrência) reportado por cliente ou técnico. Sem related_ticket_id por design — reincidências viram chamados novos. work_order_id fica sem FK até a Fase 4 criar work_orders.';

create index tickets_company_id_idx on public.tickets (company_id);
create index tickets_client_id_idx on public.tickets (client_id);
create index tickets_unit_id_idx on public.tickets (unit_id);
create index tickets_equipment_id_idx on public.tickets (equipment_id);
create index tickets_assigned_user_id_idx on public.tickets (assigned_user_id);
create index tickets_status_idx on public.tickets (status);

create trigger trg_tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();
