-- Fase 10 — o atendimento do técnico deixa de ser um formulário genérico e
-- passa a ter a forma do trabalho real: corretiva (um problema num aparelho,
-- com foto e peça) e preventiva (uma sala inteira, com medições e checklist
-- por tipo de equipamento). Esta migration abre espaço no schema para isso.

-- 1. Como o atendimento terminou -------------------------------------------
--
-- O técnico fecha o atendimento dizendo se resolveu ou se está aguardando
-- peça. Coluna nova, nullable, em vez de ampliar o check de `status`:
-- `status in ('draft','completed')` é filtrado em muitos lugares (progresso
-- do técnico, Início, consolidação do PMOC, histórico do equipamento) e todos
-- continuam corretos — `completed` segue significando "o técnico terminou a
-- parte dele" e `resolution` diz *como* terminou. Ampliar o enum de status
-- teria exigido revisar cada um desses filtros, com risco de um atendimento
-- deixar de contar como feito em algum deles.
alter table public.maintenance_records
  add column resolution text
    check (resolution in ('resolvido', 'aguardando_peca'));

comment on column public.maintenance_records.resolution is
  'Escolhido pelo técnico ao concluir: resolvido ou aguardando_peca. Null em registro antigo (pré-Fase 10) e em rascunho.';

-- 2. Categorias de foto do fluxo de corretiva --------------------------------
--
-- As categorias novas vêm da especificação do usuário: além de equipamento e
-- etiqueta (obrigatórias) e do problema, ele fotografa o problema resolvido e
-- as temperaturas de insuflamento e retorno.
--
-- `antes`/`depois` continuam válidas no constraint — podem existir linhas
-- gravadas desde a Fase 4 — mas saem da interface do técnico.
alter table public.attachments
  drop constraint attachments_category_check;

alter table public.attachments
  add constraint attachments_category_check check (
    category in (
      'equipamento',
      'etiqueta',
      'problema',
      'problema_resolvido',
      'temperatura_insuflamento',
      'temperatura_retorno',
      'antes',
      'depois',
      'outro'
    )
  );

-- 3. Medições da preventiva ---------------------------------------------------
--
-- A grade que o técnico preenche por equipamento tem cinco linhas fixas:
-- insuflamento, retorno, corrente, tensão e pressão. As três últimas já
-- existiam no seed da Fase 4; as duas de temperatura são novas. O tipo
-- genérico `temperatura` fica onde está — há medição registrada com ele e
-- remover invalidaria histórico.
insert into public.measurement_types (key, label, unit_default, data_type) values
  ('temperatura_insuflamento', 'Temperatura de insuflamento', '°C', 'numeric'),
  ('temperatura_retorno', 'Temperatura de retorno', '°C', 'numeric')
on conflict do nothing;

-- 4. Catálogo de peças --------------------------------------------------------
--
-- Existe para o técnico não digitar o nome da peça em campo. Mesmo padrão de
-- `measurement_types` (0025): company_id null = linha global semeada aqui,
-- company_id preenchido = peça que a empresa acrescentou ao próprio catálogo.
-- O campo livre "outra peça" continua disponível no formulário — o catálogo
-- cobre o comum, não fecha a porta para o incomum.
create table public.parts_catalog (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.parts_catalog is
  'Peças pré-cadastradas para seleção em campo. company_id null = catálogo global (seed); preenchido = catálogo da própria empresa.';

create unique index parts_catalog_global_name_idx
  on public.parts_catalog (lower(name)) where company_id is null;
create unique index parts_catalog_company_name_idx
  on public.parts_catalog (company_id, lower(name)) where company_id is not null;

create index parts_catalog_company_id_idx on public.parts_catalog (company_id);

create trigger trg_parts_catalog_updated_at
  before update on public.parts_catalog
  for each row execute function public.set_updated_at();

insert into public.parts_catalog (name, unit) values
  ('Capacitor', 'un'),
  ('Contator', 'un'),
  ('Filtro de ar', 'un'),
  ('Filtro secador', 'un'),
  ('Gás refrigerante R-410A', 'kg'),
  ('Gás refrigerante R-22', 'kg'),
  ('Gás refrigerante R-32', 'kg'),
  ('Correia', 'un'),
  ('Rolamento', 'un'),
  ('Placa eletrônica', 'un'),
  ('Sensor de temperatura', 'un'),
  ('Motor do ventilador', 'un'),
  ('Turbina / hélice do ventilador', 'un'),
  ('Compressor', 'un'),
  ('Válvula de expansão', 'un'),
  ('Bomba de dreno', 'un'),
  ('Mangueira de dreno', 'm'),
  ('Disjuntor', 'un'),
  ('Relé de partida', 'un'),
  ('Pressostato', 'un'),
  ('Controle remoto', 'un'),
  ('Isolamento térmico de tubulação', 'm'),
  ('Fluido de limpeza / desincrustante', 'l')
on conflict do nothing;
