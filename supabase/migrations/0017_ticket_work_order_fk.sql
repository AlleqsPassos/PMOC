-- Fase 4.1 — endurece a FK que a migration 0013 deixou reservada:
-- tickets.work_order_id agora aponta de fato para work_orders. Aditivo e
-- não-destrutivo, exatamente como o comentário original previu.

alter table public.tickets
  add constraint tickets_work_order_id_fkey
  foreign key (work_order_id) references public.work_orders(id) on delete set null;

create index tickets_work_order_id_idx on public.tickets (work_order_id);
