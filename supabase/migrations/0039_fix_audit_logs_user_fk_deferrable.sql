-- Fix de bug real (achado no primeiro teste em produção): a FK de
-- audit_logs.user_id adicionada em 0036 quebrou create_company_and_admin().
--
-- Causa raiz: create_company_and_admin() insere companies PRIMEIRO, depois
-- users, na mesma transação (0006_auth_rpcs.sql). O insert em companies
-- dispara trg_audit_companies imediatamente, que grava audit_logs.user_id =
-- auth.uid() — mas a linha correspondente em public.users ainda não existe
-- nesse instante (só é inserida no passo seguinte da mesma função). Como a
-- FK é verificada por padrão logo após cada statement (não no fim da
-- transação), o insert em audit_logs falhava com
-- "violates foreign key constraint audit_logs_user_id_fkey", derrubando a
-- função inteira e deixando uma conta em auth.users órfã (signUp já tinha
-- acontecido antes da chamada da RPC).
--
-- activate_invite() não tem esse problema — insere users primeiro, sem
-- depender de outro insert anterior no mesmo request.
--
-- Fix: torna a constraint DEFERRABLE INITIALLY DEFERRED — a checagem passa
-- a rodar só no fim da transação (commit), ponto em que users já foi
-- inserido pela mesma função. Integridade referencial continua garantida,
-- só muda quando ela é verificada. Nenhuma mudança de código de aplicação
-- necessária.
alter table public.audit_logs
  drop constraint audit_logs_user_id_fkey;

alter table public.audit_logs
  add constraint audit_logs_user_id_fkey foreign key (user_id) references public.users(id)
  on delete set null deferrable initially deferred;
