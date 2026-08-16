-- Fase 4.1 — nova permissão pro catálogo (seção 7). RESPONSAVEL_TECNICO não
-- ganha esta: gerar/reagendar/cancelar OS é ação de despachante/admin; a
-- execução em si já está coberta por `execute_work_order`, concedido desde
-- a Fase 1 (0005_seed_roles_permissions.sql).

insert into public.permissions (key, label, category) values
  ('manage_work_orders', 'Gerenciar ordens de serviço', 'work_orders');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'ADMINISTRADOR' and p.key = 'manage_work_orders';
