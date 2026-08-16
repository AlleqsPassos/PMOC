-- Fase 2 — RLS para a hierarquia física (clients, units, sectors,
-- environments, equipment). Mesmo padrão já usado em 0004_rls_base.sql
-- (seção 8/9 da arquitetura): select por company_id = auth_company_id();
-- insert com company_id da sessão + create_*; update com edit_*; sem
-- policy de delete — "excluir" é update setando deleted_at/status, coberto
-- pela própria policy de update.

-- clients -------------------------------------------------------------------
alter table public.clients enable row level security;

create policy "clients_select_same_company" on public.clients for select
  using (company_id = public.auth_company_id());

create policy "clients_insert_same_company" on public.clients for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_clients'));

create policy "clients_update_same_company" on public.clients for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'edit_clients'));

-- units -----------------------------------------------------------------
alter table public.units enable row level security;

create policy "units_select_same_company" on public.units for select
  using (company_id = public.auth_company_id());

create policy "units_insert_same_company" on public.units for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_units'));

create policy "units_update_same_company" on public.units for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'edit_units'));

-- sectors -----------------------------------------------------------------
alter table public.sectors enable row level security;

create policy "sectors_select_same_company" on public.sectors for select
  using (company_id = public.auth_company_id());

create policy "sectors_insert_same_company" on public.sectors for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_environments'));

create policy "sectors_update_same_company" on public.sectors for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'edit_environments'));

-- environments ----------------------------------------------------------------
alter table public.environments enable row level security;

create policy "environments_select_same_company" on public.environments for select
  using (company_id = public.auth_company_id());

create policy "environments_insert_same_company" on public.environments for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_environments'));

create policy "environments_update_same_company" on public.environments for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'edit_environments'));

-- equipment -----------------------------------------------------------------
alter table public.equipment enable row level security;

create policy "equipment_select_same_company" on public.equipment for select
  using (company_id = public.auth_company_id());

create policy "equipment_insert_same_company" on public.equipment for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_equipment'));

create policy "equipment_update_same_company" on public.equipment for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'edit_equipment'));
