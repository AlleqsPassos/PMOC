-- Fase 10 — RLS do que a fase abriu. Duas policies aqui **revertem**
-- restrições que a arquitetura declarava de propósito (seção 12: "medição é
-- aditiva, nunca editada"; 0029: "anexo sem update/delete"). As duas
-- reversões são consequência direta da forma nova das telas, não relaxamento
-- por conveniência — o motivo de cada uma está escrito abaixo.

-- measurements: update ------------------------------------------------------
--
-- A preventiva agora mostra uma grade com as cinco medições já listadas e o
-- técnico digita o valor em cada uma. Sem update, corrigir 22 para 24 gravaria
-- uma segunda linha do mesmo tipo no mesmo registro — e a tabela de medições
-- do PMOC passaria a ter dois valores para "temperatura de retorno" sem dizer
-- qual vale. Insert-only funcionava quando cada medição era um evento
-- registrado uma vez; deixou de funcionar quando virou um campo preenchível.
--
-- Delete continua fora: apagar medição não é operação de campo.
create policy "measurements_update_same_company" on public.measurements for update
  using (company_id = public.auth_company_id())
  with check (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );

-- attachments: delete -------------------------------------------------------
--
-- As categorias obrigatórias (equipamento, etiqueta) agora têm limite de **1**
-- foto. O caminho que a Fase 4 previa para corrigir um upload errado era
-- "reenviar na mesma categoria até o limite" — o que com limite 1 significa
-- que a primeira foto ruim é definitiva. Trocar a foto exige remover a antiga.
create policy "attachments_delete_same_company" on public.attachments for delete
  using (
    company_id = public.auth_company_id()
    and (public.has_permission(auth.uid(), 'execute_work_order') or public.has_permission(auth.uid(), 'manage_work_orders'))
  );

-- O binário no Storage precisa sair junto, senão a troca de foto deixa objeto
-- órfão pagando espaço. Mesmo limite de isolamento das outras duas policies do
-- bucket (0026): o segmento [2] do path é o company_id.
create policy "attachments_storage_delete_same_company" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[2] = public.auth_company_id()::text);

-- parts_catalog -------------------------------------------------------------
alter table public.parts_catalog enable row level security;

-- Mesma forma de measurement_types (0029): o select enxerga o catálogo global
-- (company_id null) mais o da própria empresa.
create policy "parts_catalog_select_same_company_or_global" on public.parts_catalog for select
  using (company_id = public.auth_company_id() or company_id is null);

-- Escrita só no catálogo da própria empresa — nenhum tenant edita a linha
-- global, que é gerenciada por migration.
create policy "parts_catalog_insert_same_company" on public.parts_catalog for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_parts_catalog'));

create policy "parts_catalog_update_same_company" on public.parts_catalog for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'manage_parts_catalog'));

-- sem delete: desativar (is_active = false) preserva o histórico de qualquer
-- solicitação que já citou a peça, mesma disciplina de soft-delete do resto.
