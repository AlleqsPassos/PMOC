-- Fase 10 — permissões.

-- Gerenciar o catálogo de peças é administrativo: o técnico *seleciona* a peça
-- (coberto por execute_work_order, que ele já tem), não decide o que existe no
-- catálogo.
insert into public.permissions (key, label, category) values
  ('manage_parts_catalog', 'Gerenciar catálogo de peças', 'parts');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'ADMINISTRADOR'
  and p.key = 'manage_parts_catalog'
on conflict (role_id, permission_id) do nothing;

-- `edit_equipment` para o RESPONSAVEL_TECNICO.
--
-- Isto **reverte** a decisão da Fase 9 (0040), que deu a ele só INSERT com a
-- justificativa de que corrigir cadastro era do administrador. O usuário
-- levantou depois um caso de uso concreto que não caberia nisso: o técnico pode
-- tirar um dia só para atualizar o cadastro da planta, sem OS atribuída, e aí
-- corrigir marca/modelo/tag de um aparelho já registrado é o trabalho, não uma
-- exceção. A RLS de `equipment` já exigia essa chave no `with check` — nada
-- mais muda no banco.
--
-- Inativar/excluir equipamento continua fora: não há policy de delete e a
-- inativação é feita pela tela do administrador.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'RESPONSAVEL_TECNICO'
  and p.key = 'edit_equipment'
on conflict (role_id, permission_id) do nothing;
