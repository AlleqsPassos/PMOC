-- Fase 9 — o técnico passa a poder cadastrar equipamento encontrado em campo.
--
-- Contexto: a visão do técnico foi redesenhada para partir do que foi
-- atribuído a ele; dentro da unidade atribuída ele precisa registrar um
-- aparelho que ninguém cadastrou. Nenhuma permissão nova é criada — só
-- concede duas já existentes ao RESPONSAVEL_TECNICO.
--
-- `create_environments` vem junto por necessidade de schema, não por escopo
-- inflado: `equipment.environment_id` é NOT NULL (0010_equipment.sql), então
-- sem poder criar o ambiente o cadastro morreria em qualquer sala ainda não
-- registrada — exatamente o caso que motiva a funcionalidade.
--
-- Só INSERT: ele não recebe `edit_equipment`/`edit_environments`. Corrigir ou
-- remover cadastro segue sendo do administrador, e a RLS já garante isso
-- (as policies de update exigem as chaves `edit_*`, que ele não tem).

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'RESPONSAVEL_TECNICO'
  and p.key in ('create_equipment', 'create_environments')
on conflict (role_id, permission_id) do nothing;
