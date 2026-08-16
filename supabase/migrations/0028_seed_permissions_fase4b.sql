-- Fase 4.2 — permissões novas do catálogo (seção 7). Nenhuma delas vai pro
-- RESPONSAVEL_TECNICO: configurar templates/tipos de medição é admin, e
-- avançar o status de uma solicitação de peça também — o técnico só *cria*
-- a solicitação, coberto por `execute_work_order` (já concedido).

insert into public.permissions (key, label, category) values
  ('manage_checklist_templates', 'Gerenciar templates de checklist', 'checklists'),
  ('manage_measurement_types', 'Gerenciar tipos de medição', 'measurements'),
  ('manage_parts_requests', 'Gerenciar solicitações de peças', 'parts');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'ADMINISTRADOR'
  and p.key in ('manage_checklist_templates', 'manage_measurement_types', 'manage_parts_requests');
