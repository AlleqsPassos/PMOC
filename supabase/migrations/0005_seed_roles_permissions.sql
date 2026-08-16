-- Seed dos papéis e do catálogo de permissões MVP (seções 6/7 da arquitetura).
-- Catálogo deliberadamente enxuto — cobre só o que a Fase 1 expõe
-- (usuários/permissões) mais os módulos das Fases 2-5, para os quais as
-- permissões já ficam reservadas mesmo antes da UI existir.

insert into public.roles (key, label) values
  ('ADMINISTRADOR', 'Administrador'),
  ('RESPONSAVEL_TECNICO', 'Responsável Técnico');

insert into public.permissions (key, label, category) values
  ('view_clients', 'Visualizar clientes', 'clients'),
  ('create_clients', 'Criar clientes', 'clients'),
  ('edit_clients', 'Editar clientes', 'clients'),
  ('view_units', 'Visualizar unidades', 'units'),
  ('create_units', 'Criar unidades', 'units'),
  ('edit_units', 'Editar unidades', 'units'),
  ('view_environments', 'Visualizar ambientes/setores', 'environments'),
  ('create_environments', 'Criar ambientes/setores', 'environments'),
  ('edit_environments', 'Editar ambientes/setores', 'environments'),
  ('view_equipment', 'Visualizar equipamentos', 'equipment'),
  ('create_equipment', 'Criar equipamentos', 'equipment'),
  ('edit_equipment', 'Editar equipamentos', 'equipment'),
  ('view_tickets', 'Visualizar chamados', 'tickets'),
  ('create_tickets', 'Criar chamados', 'tickets'),
  ('assign_tickets', 'Atribuir chamados', 'tickets'),
  ('edit_tickets', 'Editar chamados', 'tickets'),
  ('view_work_orders', 'Visualizar ordens de serviço', 'work_orders'),
  ('execute_work_order', 'Executar ordem de serviço', 'work_orders'),
  ('manage_preventive_plans', 'Gerenciar preventivas', 'preventive_plans'),
  ('generate_pmoc', 'Gerar PMOC', 'pmoc'),
  ('manage_users', 'Gerenciar usuários e convites', 'users'),
  ('manage_permissions', 'Gerenciar permissões', 'users'),
  ('view_audit_log', 'Visualizar auditoria', 'audit');

-- ADMINISTRADOR recebe todo o catálogo por default.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key = 'ADMINISTRADOR';

-- RESPONSAVEL_TECNICO recebe só o necessário para operação de campo.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'view_equipment',
  'view_tickets',
  'create_tickets',
  'view_work_orders',
  'execute_work_order'
)
where r.key = 'RESPONSAVEL_TECNICO';
