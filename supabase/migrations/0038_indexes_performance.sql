-- Fase 7.3 — revisão de performance: passada pelos queries.ts de todas as
-- features procurando N+1 real (nenhum encontrado — os únicos loops fora de
-- pull-sync.ts/sync-engine.ts, que já são sequenciais por design offline,
-- são agregação em memória sobre linhas já buscadas em lote) e cobertura de
-- índice nas colunas realmente usadas em filtro.
--
-- Única lacuna real encontrada: work_orders não tem índice em client_id,
-- usado tanto pelo filtro de /ordens-servico (listWorkOrders, clientId
-- opcional) quanto pela consolidação de PMOC (findEligibleWorkOrders,
-- sempre filtra client_id + status + finished_at). Índice composto cobre os
-- três filtros da query mais pesada; o índice simples de client_id sozinho
-- (já coberto pelo prefixo do composto) não precisa existir à parte.
create index work_orders_client_status_finished_idx
  on public.work_orders (client_id, status, finished_at);
