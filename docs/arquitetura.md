# PMOC+ — Documento de Arquitetura

> Este documento é a fonte permanente das decisões de arquitetura do projeto — schema, RLS, permissões, offline-first, plano de fases. Antes vivia só num arquivo de plano fora do repositório (`~/.claude/plans/`); foi portado para cá em 2026-08-16 para não depender de estado local do Claude Code. Mudanças de arquitetura devem ser refletidas aqui, não só no histórico de conversas.

## Status atual

| Fase | Escopo | Status |
|---|---|---|
| 0 | Este documento de arquitetura | ✅ Concluída |
| 1 | Fundação — auth, multi-tenancy, RLS, permissões, app shell, PWA | ✅ Concluída (commit `84bac90`) |
| 2 | Estrutura operacional — clientes, unidades, setores, ambientes, equipamentos | ✅ Concluída (commit `f5eebed`) |
| 3 | Chamados | ✅ Concluída (commit `6b90296`) |
| 4 | Manutenção (OS, preventivas, checklist, medições, anexos, peças) | ✅ Concluída (commits `bda1481` 4.1 + `20a56ad` 4.2) |
| 5 | PMOC (consolidação + PDF) | ✅ Concluída (commit `5559e0e`) |
| 6 | Offline-first (Dexie + sync) | ✅ Concluída (commit `791285f`) |
| 7 | Refinamento | ✅ Concluída (commit `ec4a67d`) |
| 8 | Simplificação de UX (home = fila de trabalho, convite por código, assistente de cadastro) | ✅ Concluída |
| 9 | A visão do técnico (menu enxuto, Início por unidade, cadastro de equipamento em campo) | ✅ Concluída (commit `900fb6a`) |
| 10 | O atendimento do técnico (corretiva e preventiva com formas próprias, ciclo de vida da OS, catálogo de peças, equipamentos do técnico) | ✅ Concluída |
| 11 | O celular do técnico (divisão em aberto/impedimentos/concluídos, foto obrigatória travando, peça por diálogo, navegação mobile) | ✅ Concluída |
| 12 | Ajustes do teste no celular (impedimento trava até o admin liberar, concluído volta a ser editável, alvos de toque, data no selo de sync) | ✅ Concluída |
| — | Deploy inicial no Vercel | ✅ Concluída — `https://pmoc-plus.vercel.app`, projeto `alex-6e84/pmoc-plus` conectado ao repo GitHub (auto-deploy a cada push em `master`) |

## Contexto

O usuário forneceu um briefing mestre completo (59 seções) para um novo produto, o **PMOC+**: uma plataforma SaaS multi-tenant (web/PWA) para empresas de manutenção de climatização gerenciarem operação de campo e gerarem documentação de PMOC. O primeiro uso real será um MVP para uma empresa que presta manutenção a um hospital (4 unidades físicas).

O repositório é novo e separado de qualquer outro projeto do usuário (`C:\Users\Alex-\ClaudeCode Projetos\PMOC+`), criado especificamente para o PMOC+.

Nota de ambiente importante: o ambiente usa Next.js com breaking changes vs. conhecimento de treinamento de LLMs em geral ("This is NOT the Next.js you know" — ver bloco auto-gerado no topo de `AGENTS.md`). Antes de escrever código de rota/App Router, ler `node_modules/next/dist/docs/` e respeitar qualquer aviso de depreciação que o `next dev` injetar.

**Confirmado na doc gerada (Next.js 16.3.1):** `middleware.ts` foi renomeado para **`proxy.ts`** (mesma funcionalidade — roda antes da requisição completar, protege rotas, redireciona — só o nome mudou). Arquivo `src/proxy.ts`, export nomeado `proxy(request)`. Todas as referências a "middleware" neste documento devem ser lidas como `proxy`.

---

## 1. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16.x, App Router, React 19 | Server Actions se encaixam bem no CRUD administrativo |
| Linguagem | TypeScript 5.x, `strict: true` | Não-negociável num sistema multi-tenant sensível a RLS |
| Estilo | Tailwind CSS v4 | Mapeia bem para os design tokens (azul técnico + cinzas neutros) |
| Componentes | shadcn/ui (Radix, copiado no repo) | Controle total de estilo |
| Forms | react-hook-form + zod | Schemas de validação compartilhados entre client e Server Actions |
| Data fetching (online) | TanStack Query | Complementa a camada offline conceitualmente |
| Backend/DB | Supabase (Postgres, Auth, Storage) | — |
| Cliente Supabase | `@supabase/supabase-js` v2 + `@supabase/ssr` | Padrão oficial de SSR por cookies no App Router |
| Banco local offline | Dexie.js (IndexedDB) | Ver seção 12 — justificativa detalhada |
| PWA/Service Worker | Serwist | Sucessor mantido do next-pwa, nativo para App Router |
| PDF (Fase 5) | `@react-pdf/renderer` | Geração baseada em componentes React |
| Ícones | lucide-react | Combina com shadcn/ui |
| Fonte | Inter via `next/font` | — |
| Hospedagem | Vercel | — |

---

## 2. Estrutura de diretórios

```
PMOC+/
├── AGENTS.md                          # bloco auto-injetado pelo Next a cada `next dev`
├── CLAUDE.md                          # @AGENTS.md + @docs/arquitetura.md
├── docs/arquitetura.md                # este documento
├── README.md
├── .env.local.example
├── .env.local                         # gitignored — URL/keys do Supabase
├── supabase/
│   ├── config.toml
│   └── migrations/                    # 0001-0012 (Fases 1-2), numeração segue crescendo
├── public/{manifest.webmanifest, icons/}
├── src/
│   ├── app/
│   │   ├── layout.tsx, globals.css
│   │   ├── (public)/{login,criar-empresa,ativar-convite/[code]}/
│   │   ├── (app)/                     # área autenticada, protegida pelo proxy
│   │   │   ├── layout.tsx             # sidebar + topbar, nav sensível a permissão
│   │   │   ├── dashboard/
│   │   │   ├── clientes/[clientId]/, unidades/[unitId]/, equipamentos/[equipmentId]/
│   │   │   ├── chamados/... preventivas/... ordens-servico/...    (Fase 3+)
│   │   │   ├── pmoc/... minhas-atividades/...                     (Fase 4+/5)
│   │   │   ├── configuracoes/{usuarios,permissoes}/...
│   │   │   └── auditoria/...                                      (UI Fase 7)
│   │   └── api/                       # só onde Server Action não couber
│   ├── components/{ui,layout,shared}/
│   ├── features/                      # módulos por domínio
│   │   └── <feature>/{actions.ts, queries.ts, schema.ts, components/}
│   ├── lib/
│   │   ├── supabase/{client.ts, server.ts, admin.ts}
│   │   ├── auth/{session.ts, permissions.ts}
│   │   ├── hooks/                     # ex: use-close-on-success.ts
│   │   └── offline/{db.ts, outbox.ts, sync-engine.ts, hooks/}      (Fase 6)
│   ├── proxy.ts                       # Next.js 16: substitui o antigo middleware.ts
│   └── types/database.types.ts        # escrito à mão (ver nota abaixo)
└── tests/
```

**`features/` implementados:** `auth`, `companies`, `users`, `invites` (Fase 1); `clients`, `units` (cobre também `sectors`/`environments`), `equipment` (Fase 2); `tickets` (Fase 3); `work-orders`, `preventive-plans`, `checklist-templates`, `maintenance`, `attachments`, `parts-requests` (Fase 4); `pmoc` (Fase 5); `audit`, `permissions` (Fase 7); `dispatch` (Fase 8); `parts-catalog` (Fase 10).

---

## 3. Entidades

**companies** — id, corporate_name, trade_name, cnpj, address, phone, email, status, timestamps. Sem colunas de plano/assinatura agora, mas nada impede adicionar `plan_id`/`subscription_status` depois.

**users** — id (**= auth.users.id**, 1:1), company_id, role_id, full_name, email, phone, status (`active`|`inactive`), invited_by, activated_at, timestamps.

> **Correção feita durante a implementação:** como `users.id = auth.users.id`, é impossível pré-criar uma linha "convidada" em `users` antes de o técnico ter identidade no Supabase Auth. Por isso não existe status `invited` em `users` — o convite pendente vive inteiramente em `invites` (com `full_name`/`email` como pré-preenchimento, não validados contra o signUp) e a linha em `users` só é criada, já `active`, no momento da ativação via `activate_invite()`, no mesmo padrão atômico de `create_company_and_admin()`.

**roles** — id, key (`ADMINISTRADOR`, `RESPONSAVEL_TECNICO`), label, is_system. Catálogo global.

**permissions** — id, key (`view_clients`, `create_clients`, `edit_equipment`, `assign_tickets`, `execute_work_order`, `generate_pmoc`, `manage_users`, `manage_permissions`, `view_audit_log`, ...), label, category. Catálogo global.

**role_permissions** — role_id, permission_id (grants padrão por papel).

**user_permissions** — user_id, permission_id, granted (bool — allow ou revoke explícito, sobrepõe o default do papel), created_by.

**invites** — id, company_id, code, role_id, email opcional, status (`pending`|`used`|`expired`|`revoked`), created_by, expires_at, used_at, used_by_user_id.

**clients** — id, company_id, corporate_name, trade_name, cnpj, address, phone, email, responsible_name, notes, status (`active`/`inactive`), timestamps. Sem `deleted_at` — "excluir" = inativar, igual `companies`.

**units** — id, company_id, client_id, name, address, responsible_name, phone, notes, status (`active`/`inactive`), timestamps, **deleted_at**+deleted_by (soft delete real).

**sectors** — id, company_id, unit_id, name, notes, timestamps, deleted_at+deleted_by. Camada opcional, sem nav item próprio (nested na página da unidade).

**environments** — id, company_id, unit_id, sector_id (**nullable** — permite Unidade→Ambiente sem Setor), name, notes, timestamps, deleted_at+deleted_by.

**equipment** — id, company_id, unit_id, sector_id (nullable), environment_id, tag (string estruturada, **única por empresa**, QR-ready mas QR não implementado), type, brand, model, serial_number, capacity_btu, refrigerant, voltage, status (`operacional`|`atencao`|`em_manutencao`|`inativo` — enum próprio, é a "gestão de status de equipamento"), notes, timestamps, deleted_at+deleted_by.

**audit_logs** *(implementado na Fase 2, escopo: clients/units/sectors/environments/equipment)* — id, company_id, user_id, action, entity_type, entity_id, previous_data (jsonb), new_data (jsonb), source (`web`|`system`), created_at. Somente inserção, imutável, via trigger genérico `audit_trigger_fn()` (SECURITY DEFINER). Sem FK rígida em entity_type/entity_id — propositalmente polimórfico. Retrofit em companies/users/invites e UI de visualização (`/auditoria`) ficam para a Fase 7.

**tickets (chamados)** *(Fase 3, não implementado)* — id, company_id, client_id, unit_id, sector_id?, environment_id?, equipment_id? (linkável depois), title, description, priority (`urgente`|`alta`|`media`|`baixa`), status (`aberto`|`designado`|`em_atendimento`|`aguardando_peca`|`aguardando_cliente`|`concluido`|`cancelado`), assigned_user_id, opened_by_user_id, opened_at, work_order_id?, notes, timestamps. Nenhum `related_ticket_id` agora — novas ocorrências viram chamados novos por design; adicionar o link depois é migração aditiva e não-destrutiva.

**work_orders (OS)** *(Fase 4)* — id, company_id, client_id, unit_id, type (`corretiva`|`preventiva`), origin_ticket_id?, origin_preventive_plan_id?, title, status, assigned_user_id, scheduled_date, started_at, finished_at, created_by, timestamps. Uma OS agrupa vários equipamentos via `maintenance_records`, não via coluna 1:1.

**preventive_plans** *(Fase 4)* — id, company_id, client_id, unit_id, period_start, period_end, periodicity (`semanal`|`quinzenal`|`mensal`|`bimestral`|`trimestral`|`semestral`|`anual`|`personalizada`), assigned_user_id, status, notes, timestamps.

**preventive_plan_equipment** *(Fase 4)* — id, preventive_plan_id, equipment_id (N:N).

**checklist_templates** *(Fase 4)* — id, company_id, name, maintenance_type (`preventiva`|`corretiva`|`ambos`), equipment_type?, timestamps. Editável pelo admin, não hardcoded.

**checklist_template_items** *(Fase 4)* — id, checklist_template_id, label, order_index, is_required, allows_other.

**maintenance_record_checklist_items** *(Fase 4)* — id, maintenance_record_id, template_item_id? (null = achado "outro" ad-hoc), label_snapshot, status (`ok`|`nao_ok`|`nao_aplica`), note. Snapshot do label preserva integridade histórica mesmo se o template mudar depois.

**maintenance_records** *(Fase 4)* — id, company_id, work_order_id, equipment_id, technician_user_id, status (`draft`|`completed`), **resolution** (`resolvido`|`aguardando_peca`, nullable — Fase 10: como o técnico fechou; `status` continua sendo o ciclo de vida, `resolution` diz o desfecho), cause_identified, service_performed, recommendation, notes, diagnosis, started_at, completed_at, timestamps. **O "laudo" não é uma tabela separada** — é o conjunto de campos narrativos aqui, renderizado junto com medições/fotos/checklist na hora de visualizar ou consolidar PMOC. O formulário do técnico mostra três deles desde a Fase 10 (diagnóstico, recomendação, observações); `cause_identified`/`service_performed` seguem no schema e no PDF.

**measurement_types** *(Fase 4)* — id, company_id? (null = default global), key (`temperatura`, `corrente`, `tensao`, `pressao` no seed original; `temperatura_insuflamento` e `temperatura_retorno` acrescentados na Fase 10 para a grade da preventiva), label, unit_default, data_type (`numeric`|`text`), is_active.

**measurements** *(Fase 4)* — id, company_id, maintenance_record_id, measurement_type_id, value_numeric?, value_text?, unit, note, created_by. **Editável desde a Fase 10** (`0042`) — ver a reversão registrada lá: virou campo preenchível numa grade, e campo preenchível precisa aceitar correção.

> **Recomendação sobre flexibilidade de medições:** tabela de tipos (`measurement_types`) + `measurements` com colunas reais tipadas, **não** JSONB solto nem EAV livre. JSONB dificulta agregação para consolidação de PMOC/dashboards; a tabela de tipos permite adicionar novos tipos futuramente como **linhas novas** (zero migração), mantendo `value_numeric`/`unit` consultável.

**attachments (fotos)** *(Fase 4, categorias e limites revistos na Fase 10)* — id, company_id, work_order_id, maintenance_record_id?, equipment_id, category (`equipamento`|`etiqueta`|`problema`|`problema_resolvido`|`temperatura_insuflamento`|`temperatura_retorno`|`antes`|`depois`|`outro` — as três do meio entraram na `0041`; `antes`/`depois` são legado da Fase 4, fora da UI do técnico mas ainda válidas no banco), storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at. Limite validado na **camada de aplicação**, não como constraint rígida de banco — e desde a Fase 10 é **por categoria** (`ATTACHMENT_CATEGORY_RULES`), não a constante única de 2: equipamento e etiqueta cabem 1 e são obrigatórias (aviso, não bloqueio), outros cabe 5. Aceita delete desde a `0042`, justamente porque com limite 1 não há como trocar uma foto ruim reenviando.

**parts_catalog** *(Fase 10)* — id, company_id (**nullable**: null = linha global do seed, mesmo precedente de `measurement_types`), name, unit, is_active, timestamps. Existe para o técnico selecionar a peça em vez de digitar. Sem delete — desativar preserva o histórico de qualquer solicitação que já citou a peça.

**parts_requests** *(Fase 4)* — id, company_id, work_order_id, maintenance_record_id?, requested_by_user_id, part_name, quantity, note, status (`Solicitada`|`Em andamento`|`Aguardando`|`Resolvida`|`Cancelada`), updated_by, timestamps.

**pmocs** *(Fase 5)* — id, company_id, client_id, period_start, period_end, title, status (`draft`|`generated`), pdf_storage_path?, generated_by, generated_at, timestamps, + campos nullable de extensão futura (responsible_technician_name, professional_registry, art_number, signature_storage_path) para não exigir migração destrutiva depois.

**pmoc_work_orders** *(Fase 5)* — id, pmoc_id, work_order_id (rastreabilidade do que foi consolidado).

**sync_operations** *(Fase 6)* — id, company_id, user_id, idempotency_key (unique), entity_type, entity_id, status (`applied`|`duplicate`|`failed`), applied_at. Ledger de dedupe server-side para mutações offline reenviadas.

---

## 4. Relacionamentos

```
companies (1)──<users (role_id→roles)          companies (1)──<clients          companies (1)──<invites
roles (1)──<role_permissions>──(1) permissions   users (1)──<user_permissions>──(1) permissions

clients (1)──<units──<sectors
units (1)──<environments>──(0..1) sectors        environments (1)──<equipment
tickets: clients(1)──<, units(1)──<, equipment(0..1)>──   tickets(1)──<work_orders (origin_ticket_id, opcional)

preventive_plans: clients(1)──<, units(1)──<
preventive_plans(1)──<preventive_plan_equipment>──(1) equipment
preventive_plans(1)──<work_orders (origin_preventive_plan_id, opcional)

work_orders(1)──<maintenance_records>──(1) equipment
maintenance_records(1)──<measurements>──(1) measurement_types
maintenance_records(1)──<maintenance_record_checklist_items>──(0..1) checklist_template_items
maintenance_records(1)──<attachments        work_orders(1)──<attachments (link a maintenance_record opcional)
work_orders(1)──<parts_requests             maintenance_records(0..1)──<parts_requests

clients(1)──<pmocs──<pmoc_work_orders>──(1) work_orders
*(tudo acima)──<audit_logs (entity_type+entity_id, polimórfico, sem FK rígida)
```

Toda tabela de domínio abaixo de `companies` carrega seu próprio `company_id` (denormalizado, não só via join) — cada policy de RLS fica um check plano `company_id = auth_company_id()`, sem joins recursivos.

---

## 5. Auth

- `@supabase/ssr` para sessão SSR por cookies no App Router: três factories de cliente — browser (`lib/supabase/client.ts`), server/RSC+Server Actions (`server.ts`), e admin/service-role (`admin.ts`, server-only, nunca importado em componente client).
- `src/proxy.ts` faz refresh da sessão e redireciona não-autenticados de `(app)` para `/login`.
- `public.users.id = auth.users.id` — sem PK serial separada, viabiliza policies simples (`auth.uid() = users.id`, `company_id = auth_company_id()`).
- **Criação de empresa (primeiro admin):** cliente coleta email/senha/dados da empresa → após `auth.signUp()`, uma função Postgres `create_company_and_admin(...)` (SECURITY DEFINER, via Server Action) insere `companies` + `users` (role=ADMINISTRADOR) numa transação atômica, usando o `auth.uid()` recém-criado.
- **Convite/ativação de técnico:** admin cria `invites` com código gerado (nanoid, alfabeto sem caracteres ambíguos). Técnico acessa `/ativar-convite/[code]`, define credenciais → `auth.signUp()` → RPC `activate_invite(code, auth_uid)` (SECURITY DEFINER) valida o código, cria a linha em `users` já `active`, marca o convite como usado — atomicamente, evitando identidade autenticada órfã sem empresa.
- Checagens de empresa/permissão **sempre** reverificadas server-side (RLS + guards em Server Action) — checagem client-side é só UX (esconder itens de menu), nunca fronteira de segurança.
- **Pré-requisito de configuração do projeto Supabase:** "Confirm email" desativado em Authentication → Providers → Email, senão `signUp()` não retorna sessão utilizável na mesma requisição.

---

## 6. Roles

```sql
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.roles (key, label) values
  ('ADMINISTRADOR', 'Administrador'),
  ('RESPONSAVEL_TECNICO', 'Responsável Técnico');
```

Global, não por empresa — reserva espaço para papéis futuros (Técnico, Supervisor, Almoxarifado) sem alterar a forma da tabela.

---

## 7. Permissions

```sql
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null, label text not null, category text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references roles(id),
  permission_id uuid not null references permissions(id),
  primary key (role_id, permission_id)
);

create table public.user_permissions (
  user_id uuid not null references users(id),
  permission_id uuid not null references permissions(id),
  granted boolean not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);
```

Função de resolução de permissão efetiva (usada em RLS e em Server Actions, via `src/lib/auth/permissions.ts`):

```sql
create or replace function public.has_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select up.granted from user_permissions up join permissions p on p.id = up.permission_id
      where up.user_id = p_user_id and p.key = p_permission_key),
    (select true from role_permissions rp join permissions p on p.id = rp.permission_id
       join users u on u.role_id = rp.role_id
      where u.id = p_user_id and p.key = p_permission_key),
    false
  );
$$;
```

Precedência: override explícito em `user_permissions` (allow ou revoke) > default do papel > deny.

**Catálogo atual** (seed em `0005_seed_roles_permissions.sql`) por categoria: clientes, unidades, ambientes (cobre setores também), equipamentos, chamados, OS, preventivas, PMOC, usuários/permissões, auditoria. ADMINISTRADOR recebe tudo por default; RESPONSAVEL_TECNICO recebe `view_equipment`, `view_tickets`, `create_tickets`, `view_work_orders`, `execute_work_order` — **não** tem acesso a clientes/unidades (só a equipamentos, e só leitura).

---

## 8. Multi-tenancy

```sql
create or replace function public.auth_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.users where id = auth.uid()
$$;
```

`security definer` evita recursão de RLS quando a função é chamada de dentro de uma policy em `users`. Ponto de partida é lookup direto na tabela; se custo por request importar em escala, trocar depois por claim `company_id` no JWT (custom access token hook) sem mudar a forma de nenhuma policy — só o corpo da função.

Padrão de policy (aplicado uniformemente a clients/units/sectors/environments/equipment/tickets/etc.):

```sql
alter table public.clients enable row level security;

create policy "clients_select_same_company" on public.clients for select
  using (company_id = public.auth_company_id());

create policy "clients_insert_same_company" on public.clients for insert
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'create_clients'));

create policy "clients_update_same_company" on public.clients for update
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id() and public.has_permission(auth.uid(), 'edit_clients'));
-- sem policy de delete para tabelas operacionais — soft-delete via update
```

`company_id` nunca é confiado a partir do input do cliente — sempre derivado da sessão autenticada dentro da Server Action.

**Verificado empiricamente** (Fase 1 e Fase 2): criando empresas de teste novas via `/criar-empresa`, nenhuma tabela vaza dados entre empresas — nem em listagens, nem em acesso direto por URL a um ID de outra empresa (retorna 404, não erro de permissão, porque a linha simplesmente não existe do ponto de vista da query com RLS ativa).

---

## 9. RLS por categoria de tabela

| Categoria | Tabelas | Forma da policy |
|---|---|---|
| Tenant padrão | clients, units, sectors, environments, equipment, tickets, work_orders, preventive_plans, maintenance_records, measurements, attachments, parts_requests, pmocs | `company_id = auth_company_id()` + `has_permission()` por ação |
| Catálogo global + tenant | measurement_types, parts_catalog | select onde `company_id = auth_company_id() or company_id is null`; write só no da própria empresa, por `manage_measurement_types`/`manage_parts_catalog` — a linha global é gerenciada por migration |
| Raiz | companies | select só `id = auth_company_id()`; sem insert/update do cliente — só via RPC SECURITY DEFINER |
| users | users | select onde `company_id = auth_company_id()`; update do próprio perfil livre; update de `role_id`/`status` exige `manage_users` (reforçado por trigger, não só policy) |
| Catálogos globais | roles, permissions | select para autenticado; sem write do cliente (gerenciado por migration) |
| role_permissions | role_permissions | select autenticado; write via `manage_permissions` |
| user_permissions | user_permissions | select onde usuário-alvo é da mesma empresa; write via `manage_permissions` |
| invites | invites | select/insert/update via `manage_users`, escopado por empresa; validação no ato de ativação via RPC SECURITY DEFINER, não acesso direto anon |
| audit_logs | audit_logs | insert só via trigger/SECURITY DEFINER; select via `view_audit_log`; **sem policy de update/delete para ninguém** |

---

## 10. Storage

*(Ainda não implementado — chega na Fase 4 com `attachments`.)*

Buckets privados planejados: `attachments` (fotos), `pmoc-pdfs` (PDFs gerados). Acesso só via signed URL server-side após checagem de permissão/empresa.

```
attachments bucket: company/{company_id}/work-orders/{work_order_id}/{category}/{uuid}.{ext}
pmoc-pdfs bucket:    company/{company_id}/pmoc/{pmoc_id}/{filename}.pdf
```

```sql
create policy "attachments_select_same_company" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[2] = public.auth_company_id()::text);

create policy "attachments_insert_same_company" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[2] = public.auth_company_id()::text);
```

O segmento de path é o limite de isolamento no storage; a linha correspondente em `attachments` (com FK real a `work_orders`/`maintenance_records`) é a fonte de verdade para checagens mais finas, feitas na Server Action de upload antes de gerar o path.

---

## 11. PWA

- `public/manifest.webmanifest`: nome "PMOC+", `display: standalone`, `start_url: /dashboard`, ícones 192/512/maskable, theme_color = azul técnico.
- Serwist no `next.config.ts` (requer `--webpack`, não funciona com Turbopack — ver `package.json` scripts): **NetworkFirst** para navegações HTML e chamadas REST do Supabase; **CacheFirst** para assets estáticos.
- Service worker **não** é o mecanismo de dados offline — só torna o app shell instalável/carregável offline. Escrita offline real é responsabilidade da camada Dexie/IndexedDB (seção 12, Fase 6).
- Instalação: `InstallAppButton` escuta `beforeinstallprompt`.
- **Nota de verificação:** registro do service worker não foi confirmável no navegador sandboxed usado durante o desenvolvimento (fetch do `/sw.js` funciona, `register()` falha silenciosamente) — headers/conteúdo/status confirmados corretos via curl direto. **Confirmado em produção** após o deploy no Vercel: `navigator.serviceWorker.getRegistrations()` retorna o worker `active: true` em `https://pmoc-plus.vercel.app/` — era mesmo limitação do sandbox, não bug real.

---

## 12. Offline-first (decisão crítica — implementado na Fase 6, ver seção 15 pros detalhes de implementação e bugs corrigidos)

**Recomendação: Dexie.js (IndexedDB) + outbox/fila de sincronização feita à mão, não WatermelonDB/RxDB/PowerSync, no MVP.**

- **WatermelonDB**: construído em torno de bindings nativos (React Native/SQLite); adapter web é caminho secundário, mal suportado. Não recomendado aqui.
- **RxDB**: capaz, mas mais pesado, curva de aprendizado maior, e recursos relevantes (replicação de anexos, alguns plugins de conflito) ficam em tier pago ou pouco testados em produção. Overkill para MVP de um único tenant.
- **PowerSync**: provavelmente a resposta "certa" a longo prazo (integração oficial com Supabase para exatamente este problema), mas exige subir/pagar o serviço PowerSync antes mesmo de a Fase 1 ter usuário validado. **Revisitar explicitamente na Fase 6** se o Dexie feito à mão mostrar limites reais.
- **Dexie**: leve, mantido ativamente, `liveQuery`/hooks React de primeira classe, sem infra paga, escolha adequada e "chata" (no bom sentido) para a escala real (um hospital, poucos técnicos).

**Decisão de schema já tomada** (todas as PKs relevantes já são UUID): toda tabela gravável offline (tickets, work_orders, maintenance_records, measurements, attachments-metadados, parts_requests, respostas de checklist) deve usar **PK UUID gerável no cliente** (default `gen_random_uuid()` no servidor, mas o cliente pode fornecer seu próprio UUID no insert). É a espinha dorsal de idempotência: registro criado offline gera o UUID no dispositivo, salvo no Dexie sob esse id, depois enviado via `upsert(... on conflict (id) do update)` — retries são naturalmente idempotentes porque a PK nunca muda.

**Outbox** — tabela Dexie `outbox`: `{id, entityTable, entityId, operation: insert|update|delete, payload, guardUpdatedAt?, createdAt, attemptCount, lastAttemptAt, lastError, status: pending|syncing|synced|error}` (`src/lib/offline/db.ts`). `delete` entrou na Fase 10, pela troca de foto. Toda leitura na UI do técnico passa pelo Dexie (`useLiveQuery`), nunca direto no Supabase.

**Conflitos**: cada OS/maintenance_record é essencialmente single-writer (o técnico designado). Implementado: **concorrência otimista com update guardado** só na transição terminal "concluir atendimento" (`guardUpdatedAt` comparado contra o `updated_at` real do servidor antes de aplicar — se divergiu, descarta o otimista local, repuxa a verdade e avisa via toast); **last-write-wins simples** para "iniciar", campos narrativos e transições de status da OS (guardar todas as mutações encadeadas do mesmo registro criaria falso conflito com a própria edição sequencial do técnico); **aditivo, sem disputa** para fotos. Decisão consciente de não guardar tudo — ver seção 15 pro raciocínio completo.

> **Correção da Fase 10:** medição deixou de ser aditiva. A preventiva passou a mostrar uma grade de valores preenchíveis, e sem UPDATE cada correção viraria uma linha nova do mesmo tipo no mesmo registro — a tabela do PMOC teria dois valores para "temperatura de retorno" sem dizer qual vale. Continua sem delete, e a gravação é last-write-wins como o resto (single-writer por registro).

**Ressalva de plataforma crítica**: iOS Safari (relevante para iPads/iPhones do hospital) tem suporte historicamente limitado/inexistente à Background Sync API. O motor de sync não pode depender só dela — disparar sync em foreground/`visibilitychange`, em eventos `online`, e com fallback de polling em foreground.

---

## 13. Sincronização (implementado na Fase 6, ver seção 15)

Estados visíveis na UI (badge no topbar, `SyncStatusBadge`/`src/lib/offline/sync-store.ts`): `Offline`, `Online`, `Sincronizando`, `Sincronizado`, `Erro de sincronização` — de uma store client-side combinando `navigator.onLine`, eventos `online`/`offline` e o tamanho/status da fila do outbox via `useLiveQuery`.

Fluxo implementado: reconexão (ou app em foreground, ou poll a cada 30s) → **drena primeiro, só then puxa** (`drainThenPull()`) → `drainOutbox()` processa a fila em ordem de criação → cada item de `operation: 'insert'` via `upsert` idempotente, cada item de `operation: 'update'` via `update().eq('id', ...)` **puro, nunca upsert** (ver nota de bug real abaixo) → sucesso remove da fila; falha marca `error` com backoff exponencial (retry respeitando o tempo decorrido, sem bloquear o resto da fila). Server-side, ledger `sync_operations` (constraint unique em `idempotency_key` = id do próprio item do outbox) protege contra aplicação duplicada.

**Bug real encontrado e corrigido no QA desta fase — upsert em update parcial quebra RLS/NOT NULL:** `.upsert(payload, {onConflict:'id'})` vira `INSERT ... ON CONFLICT (id) DO UPDATE` no Postgres. Mesmo quando a linha já existe e só uma atualização é pretendida, o Postgres constrói e valida a linha do INSERT hipotético (checando RLS `WITH CHECK` e constraints NOT NULL) **antes** de sequer detectar o conflito — um payload parcial (só os campos que mudaram, sem `company_id`/`work_order_id`/`equipment_id`) falha com "new row violates row-level security policy" ou "null value in column ... violates not-null constraint", mesmo a UPDATE em si sendo perfeitamente válida. Corrigido separando por `operation` no drain: só `insert` usa `upsert`; `update` usa `update()` puro, que nunca constrói uma linha de INSERT e portanto nunca dispara essa validação. Lição para qualquer código futuro que grave via outbox: **nunca usar upsert para uma mutação que é só update.**

**Ordem pull vs. drain — outro bug real:** puxar dados do servidor *antes* de drenar o outbox sobrescreve (via `bulkPut`) a edição otimista local com o estado *anterior* do servidor, porque a mutação local ainda não chegou lá — a UI "volta no tempo" por um instante (ex: um laudo salvo offline parece sumir) até o drain, que roda depois, reaplicar. Corrigido: `drainThenPull()` — sempre drena primeiro, pull só depois, em todo gatilho (reconexão, poll, botão manual de atualizar).

---

## 14. Estratégia de auditoria

```sql
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null, user_id uuid,
  action text not null, entity_type text not null, entity_id uuid not null,
  previous_data jsonb, new_data jsonb,
  source text not null default 'web',
  created_at timestamptz not null default now()
);
-- somente inserção: nenhuma policy de update/delete definida para nenhum papel.
```

**Implementado na Fase 2** para clients/units/sectors/environments/equipment via `audit_trigger_fn()` genérico (SECURITY DEFINER, `AFTER INSERT OR UPDATE`, grava `to_jsonb(OLD)`/`to_jsonb(NEW)`). Verificado via query direta: `entity_type`, `entity_id`, `user_id`, `previous_data`/`new_data` todos corretos. Estendido nas fases seguintes (tickets, work_orders/preventive_plans/maintenance_records, checklist_templates/parts_requests, pmocs) sempre com o mesmo trigger genérico.

**Retrofit concluído na Fase 7** (`0036_audit_retrofit.sql`): `companies`/`users`/`invites` também passaram a ter trigger — `companies` via `audit_trigger_fn_companies()` (variante mínima, já que a tabela não tem coluna `company_id` própria, usa o próprio `id`), `users`/`invites` via a função genérica (ambas já tinham `id`+`company_id`). Cobre automaticamente `create_company_and_admin()`/`activate_invite()` (RPCs `SECURITY DEFINER`) sem precisar de captura manual — trigger dispara independente de a escrita vir de RPC ou DML direto. `audit_logs.user_id` ganhou FK real pro embedded select `user:users(full_name)` funcionar na tela de auditoria (antes era um `uuid` solto). `user_permissions` (PK composta, sem `id`) não pode usar o trigger genérico — captura de "permissão alterada manualmente" é feita em camada de aplicação via RPC `log_permission_change()` (`0037_permissions_audit_rpc.sql`, `SECURITY DEFINER`, revalida `manage_permissions` e que o alvo é da mesma empresa antes de gravar — só caminho que a aplicação tem pra inserir em `audit_logs` fora do trigger). "PMOC gerado" já estava coberto desde a Fase 5 pelo trigger em `pmocs`.

**Bug real encontrado no primeiro teste real em produção, corrigido em `0039_fix_audit_logs_user_fk_deferrable.sql`:** a FK de `audit_logs.user_id` (acima) quebrava `/criar-empresa` — `create_company_and_admin()` insere `companies` **antes** de `users` na mesma transação; o insert em `companies` dispara `trg_audit_companies` imediatamente, que tenta gravar `audit_logs.user_id = auth.uid()`, mas a linha de `public.users` correspondente só é inserida no passo seguinte da mesma função. Como a FK é verificada por padrão logo após cada statement (não no fim da transação), o insert em `audit_logs` falhava, derrubando `create_company_and_admin()` inteira e deixando uma conta em `auth.users` órfã (o `auth.signUp()` já tinha acontecido antes da chamada da RPC — exatamente o cenário que a arquitetura sempre quis evitar, seção 5). `activate_invite()` não tem esse problema (insere `users` primeiro, sem depender de outro insert anterior). Fix: constraint marcada `deferrable initially deferred` — checagem passa a rodar só no fim da transação, ponto em que `users` já existe. Integridade referencial continua garantida, só muda quando é verificada; nenhuma mudança de código de aplicação necessária. **Lição para futuras FKs em `audit_logs`/tabelas com trigger de auditoria:** se a tabela referenciada pode ser inserida *depois* da tabela auditada dentro da mesma função `SECURITY DEFINER`, a FK precisa nascer `deferrable initially deferred` — não assumir que triggers `AFTER INSERT` sempre veem um estado já consistente entre tabelas irmãs da mesma transação.

**UI de visualização** (`/auditoria`, Fase 7): lista paginada com filtro por entidade/data, cada linha expansível (`<details>` nativo, sem JS) mostrando o diff — campos alterados (update) ou o registro completo (insert/eventos sem `previous_data`). Card "Atividade recente" no dashboard (substituiu o antigo card estático "Pendências") reaproveita a mesma query, mostrando os 5 eventos mais recentes.

**Soft-delete**: tabelas operacionais e units/sectors/environments/equipment recebem `deleted_at`, `deleted_by` (clients usa só `status`, ver seção 3). Nenhuma policy de RLS de `delete` é concedida a ninguém — a ação "excluir" na aplicação é sempre um update (`set deleted_at = now(), deleted_by = ...` ou `set status = 'inactive'`), que também é auditado pelo trigger. Leituras/listas filtram `deleted_at is null` por default. Purge definitivo fica fora do escopo do MVP.

---

## 15. Plano de implementação por fases

### FASE 1 — FUNDAÇÃO ✅ concluída

Auth completo (login, criação de empresa, convite/ativação de técnico), multi-tenancy + RLS base, catálogo de permissões, app shell com nav sensível a permissão, dashboard shell, PWA base (manifest + Serwist). RLS smoke test com 2 empresas de teste passou. `npm run build --webpack` limpo.

### FASE 2 — Estrutura operacional ✅ concluída

Hierarquia física completa: Cliente → Unidade → Setor (opcional) → Ambiente → Equipamento. CRUD das 5 entidades com formulários em cascata, navegação da hierarquia por páginas de detalhe, gestão de status de equipamento (4 estados), auditoria ligada aos 5 cadastros. Verificado: build/lint limpos, fluxo manual completo, RLS confirmado com empresa nova (lista vazia + 404 em acesso direto), auditoria confirmada via query direta, permissões confirmadas com Responsável Técnico (nav filtrada, `/clientes`/`/unidades` bloqueados, `/equipamentos` só leitura).

### FASE 3 — Chamados ✅ concluída

CRUD de chamados, workflow de status (aberto→designado→em_atendimento→aguardando_peça/cliente→concluído/cancelado) com timeline derivada de `audit_logs` via RPC `get_ticket_timeline` (escopada por `view_tickets`, não `view_audit_log` — evita exigir permissão de auditoria completa só para ver o histórico do próprio chamado), criação pelo admin (cascata cliente→unidade→setor?→ambiente?→equipamento?) e pelo técnico (ad-hoc a partir do equipamento, localização resolvida no servidor), atribuição (avança `aberto`→`designado` automaticamente), view "Minhas atividades" (chamados do técnico logado, ainda abertos). `equipment_id`/`work_order_id` nullable desde já — `work_order_id` fica sem FK até a Fase 4 criar `work_orders` (migração aditiva). Verificado: build/lint limpos, fluxo manual completo (admin e Responsável Técnico), RLS confirmado com empresa nova (lista vazia + 404 em acesso direto), permissões do técnico corretas (cria chamados, não edita/atribui, timeline visível sem `view_audit_log`).

### FASE 4 — Manutenção ✅ concluída

Maior fase do roadmap até aqui, entregue em duas sub-fases dentro da mesma sessão (só um checkpoint de verificação intermediário, sem mudança de escopo):

- **4.1 — Estrutura**: `work_orders` (geradas de chamado = corretiva, com escolha manual de equipamento(s), ou de `preventive_plans` = preventiva, equipamentos herdados do plano), `preventive_plans` + `preventive_plan_equipment` (CRUD completo, cascata cliente→unidade→multi-select), `maintenance_records` (um por equipamento, criado em lote na geração da OS). Permissão nova `manage_work_orders`; RLS de update com dupla-permissão (`manage_work_orders` OU `execute_work_order`, mesmo padrão de tickets). `tickets.work_order_id` ganhou a FK real reservada desde a Fase 3.
- **4.2 — Execução**: `checklist_templates`/itens (editável pelo admin, sem hardcode), respostas de checklist por equipamento (`label_snapshot` preserva o texto se o template mudar depois), `measurement_types` (4 globais seedados: temperatura/corrente/tensão/pressão, mais os que cada empresa quiser adicionar) + `measurements` (aditivo, sem update/delete), `attachments` + bucket Storage privado `attachments` (upload direto do client component, limite de 2 fotos/categoria reforçado na Server Action), `parts_requests` (técnico cria durante a execução, admin avança o status — fluxo administrativo separado). 3 permissões novas (`manage_checklist_templates`, `manage_measurement_types`, `manage_parts_requests`), nenhuma para Responsável Técnico — a execução em si já está coberta por `execute_work_order`.
- Fluxo de atendimento (`/ordens-servico/[id]/atender/[registroId]`): iniciar → aplicar template de checklist → marcar item a item (+ itens "outro" ad-hoc) → registrar medições → subir fotos por categoria → solicitar peças → salvar laudo incrementalmente (cada seção é uma Server Action pequena, não um form gigante) → concluir. `equipamentos/[id]` mostra histórico real (laudo + diagnóstico de OS concluídas, antes um placeholder vazio); `/minhas-atividades` estendida para OS em aberto, além de chamados.
- Bug real encontrado e corrigido no teste manual: formatar uma coluna `date` pura (sem hora) via `new Date(string)` + `date-fns` exibia o dia anterior em fusos atrás de UTC (Brasil) — corrigido com `src/lib/format-date.ts` (parse manual da string, sem instanciar `Date`).

Verificado: build/lint limpos nas duas sub-fases; fluxo manual completo de ponta a ponta (chamado→OS corretiva e preventiva→OS preventiva, atendimento completo incluindo upload real de foto no Storage, conferido no histórico do equipamento após reload); RLS confirmado com empresa nova em cada sub-fase (listas vazias + 404, inclusive na rota de atendimento); permissões do Responsável Técnico corretas (executa qualquer OS via `execute_work_order`, sem gerar/cancelar OS, sem gerenciar templates/tipos de medição, cria solicitação de peça mas não muda o status dela).

### FASE 5 — PMOC ✅ concluída

Consolidação por cliente/período entre todas as unidades daquele cliente, num único PDF técnico, fechando o motivo de existir do produto.

- `pmocs` (`client_id`, `period_start`/`period_end`, `title`, `status` `draft`|`generated`, `pdf_storage_path`, `generated_by`/`generated_at`, + campos nullable de extensão futura já presentes em branco: `responsible_technician_name`, `professional_registry`, `art_number`, `signature_storage_path`) e `pmoc_work_orders` (join de rastreabilidade — quais OS entraram, `company_id` denormalizado mesmo sendo N:N, mesmo padrão de `preventive_plan_equipment`). Bucket Storage privado `pmoc-pdfs`, mesmo padrão de path/policy de `attachments`.
- **Seleção das OS é automática, não curada**: todas as `work_orders` do cliente com `status='concluida'` e `finished_at` dentro do período, cobrindo todas as unidades de uma vez (filtro só por `client_id`). Limite superior exclusivo (dia seguinte) na query, não `.lte()`, pra não truncar a última data por causa da hora do `finished_at` — mesma cautela de fuso da Fase 4.
- **Decisão de fluxo que evita `draft` órfão**: a Server Action `generatePmoc` busca as OS elegíveis, monta o PDF inteiro em memória (`renderToBuffer`) e só grava no banco (`pmocs` + `pmoc_work_orders`) depois do upload pro Storage ter sucesso. Toda linha de `pmocs` nasce já `status='generated'` — a coluna `draft` existe no schema por fidelidade à arquitetura, mas nenhum caminho de código a alcança. Zero OS elegíveis no período retorna erro claro, sem gravar nada.
- Conteúdo do PDF (v1, escopo deliberadamente contido): cabeçalho (empresa/cliente/CNPJ/período), por unidade → por OS → por equipamento: dados do equipamento, checklist, medições, texto completo do laudo, técnico responsável, datas. **Sem fotos embutidas** — decisão de escopo explícita (embutir imagem remota via signed URL no react-pdf é uma dependência de rede frágil dentro de geração de documento; fotos continuam acessíveis no sistema, por OS).
- `features/pmoc/queries.ts` reaproveita `getMaintenanceRecordDetail` (já existente desde a Fase 4) por equipamento em vez de duplicar a query de checklist/medições/laudo — só monta a consolidação por cima.
- Download via signed URL (1h, mesmo padrão de `attachments`), gerado sob demanda por Server Action (`getPmocDownloadUrl`), nunca um link público direto.
- Nenhuma permissão nova: `generate_pmoc` já existia desde o seed da Fase 1; RESPONSAVEL_TECNICO não a recebe (módulo exclusivo do admin).

Verificado: build/lint limpos; fluxo manual completo de ponta a ponta (chamado→OS→execução→laudo→conclusão→geração de PMOC→download real do PDF a partir do bucket, signed URL confirmada servindo o binário); caso de período sem OS concluída testado (erro claro, nenhuma linha órfã em `pmocs`); RLS confirmado com empresa nova (`/pmoc` vazio, acesso direto a `/pmoc/[id]` de outra empresa → 404); permissão do Responsável Técnico confirmada (nav item oculto, página bloqueada com `AccessDenied`); dashboard com contagem real de PMOCs gerados.

### FASE 6 — Offline-first ✅ concluída

Camada de dados offline de verdade (IndexedDB via Dexie) para a **UI do técnico** — decisão de escopo explícita: telas de admin/despachante (clientes/unidades/equipamentos, geração de OS, preventivas, templates de checklist, PMOC, usuários) continuam só online, são ações tipicamente feitas com conectividade e reescrevê-las não estava no briefing.

- `src/lib/offline/db.ts` — schema Dexie completo: tabelas graváveis (`maintenanceRecords`, `checklistItems`, `measurements`, `partsRequests`, `attachments`+`attachmentBlobs`, `tickets`), referência só-leitura populada pelo pull (`workOrders`, `equipment`, `checklistTemplates`+itens, `measurementTypes`), infra (`outbox`, `meta`). PK de toda tabela gravável = `id` (uuid) gerado no cliente via `crypto.randomUUID()`, mesma decisão de schema da Fase 1.
- `pull-sync.ts` — `pullTechnicianData()` baixa tudo que o técnico logado precisa (OS atribuídas + seus registros/checklist/medições/peças/anexos-metadados, chamados dele, catálogo de referência da empresa inteira — dataset pequeno, hospital único).
- `outbox.ts` + `sync-engine.ts` — `enqueue()` grava a fila; `drainOutbox()` processa em ordem de criação; `requestSync()`/`drainThenPull()`/`setupSyncTriggers()` (reconexão + foreground + poll de 30s, ressalva iOS Safari sem Background Sync).
- `sync-store.ts` + `SyncStatusBadge` — os 5 estados reais (seção 13), substituindo o placeholder estático das Fases 1-5.
- `sync_operations` (migrations 0034-0035) — ledger de idempotência server-side.
- **UI reescrita local-first**: `/minhas-atividades` (`MinhasAtividadesList`, `useLiveQuery`) e o fluxo de atendimento inteiro (`AtendimentoWizard` + `features/maintenance/offline-actions.ts`, `features/attachments/offline-actions.ts`, `features/parts-requests/offline-actions.ts`) — checklist (aplicar template, item ad-hoc, mudar status), medições, fotos (Blob local, upload adiado pro drain), peças, laudo incremental, iniciar/concluir atendimento. Chamado ad-hoc do equipamento também offline (`TicketQuickFormDialog` + `features/tickets/offline-actions.ts`).
- Server Actions que ficaram sem nenhum caller depois da reescrita foram removidas: `features/maintenance/actions.ts` (arquivo inteiro), `features/attachments/actions.ts` (arquivo inteiro), `createPartsRequest`, `createTicketFromEquipment` — mantido só o que ainda serve telas de admin (`updatePartsRequestStatus`, `createTicket`/`updateTicket`).
- **Três bugs reais encontrados e corrigidos no QA "modo avião"** (detalhados na seção 13): ordem pull-antes-do-drain sobrescrevendo edição otimista; `upsert()` em update parcial derrubando RLS/NOT NULL (Postgres valida a linha do INSERT hipotético do `ON CONFLICT DO UPDATE` antes de checar o conflito); erro do outbox exibindo `[object Object]` por `PostgrestError` não ser `instanceof Error`. Mais um bug de hydration no `SyncStatusBadge` (`navigator.onLine`/IndexedDB não existem no SSR) corrigido com `useSyncExternalStore`.
- QA "modo avião" nesta sessão foi emulado via `navigator.onLine` sobrescrito + eventos `online`/`offline` disparados manualmente (o ambiente de browser disponível é MCP, sem device físico) — limitação documentada, não um teste de device real.

Verificado: build/lint limpos; fluxo completo — abrir atendimento online (pull já feito) → forçar offline → preencher checklist/medição/foto/peça/laudo/iniciar → conferir tudo salvo local com o badge "Offline" e fila > 0 → forçar online → drain automático → conferir via página de detalhe da OS (server-side, não Dexie) que os dados chegaram no Supabase com os mesmos ids gerados no cliente, incluindo a conclusão do atendimento sem falso conflito de guarda. Revisitar PowerSync (seção 12) só se este Dexie feito à mão se mostrar insuficiente em escala real — não é decisão desta fase.

### FASE 7 — Refinamento ✅ concluída

Fecha três dívidas explicitamente documentadas desde fases anteriores (não itens novos inventados): retrofit de auditoria em companies/users/invites e UI de `/auditoria` (prometidos em `0012_audit_logs.sql`), e a UI de `/configuracoes/permissoes` (rota e permission key já reservadas desde a Fase 1, só a página faltava). Dividida em 3 sub-fases, mesma sessão, checkpoints intermediários.

- **7.1 — Auditoria**: retrofit de trigger em companies/users/invites (seção 14) + FK real em `audit_logs.user_id` + índice `(company_id, created_at desc)` (`0036_audit_retrofit.sql`). `features/audit/` (queries paginadas/filtradas, diff genérico por chave alterada, sem conhecimento por entidade). Página `/auditoria` (filtro por entidade/data, paginação, diff expansível via `<details>` nativo — zero JS extra pra isso). Card "Atividade recente" no dashboard substitui o antigo card estático "Pendências" (texto citava módulos que já existiam havia 3 fases).
- **7.2 — Permissões**: `features/permissions/` — catálogo por papel read-only (tabela roles × permissions, gerenciado por migration, não editável na UI) + painel de overrides por usuário (salvamento imediato por linha, mesmo padrão de `EquipmentStatusSelect`). `user_permissions`/`role_permissions` já existiam desde a Fase 1 — só a UI faltava. Como `user_permissions` não tem coluna `id` (PK composta), a captura de auditoria de "permissão alterada manualmente" não pode usar o trigger genérico — RPC dedicada `log_permission_change()` (`0037_permissions_audit_rpc.sql`, `SECURITY DEFINER`, revalida `manage_permissions` e mesma empresa antes de gravar) resolve isso em camada de aplicação, conforme já previsto na arquitetura.
- **7.3 — Dashboard, performance, acessibilidade, revisão de segurança**:
  - Card "OS atrasadas" (`countOverdueWorkOrders`) + `src/lib/today-date.ts` (`Intl.DateTimeFormat` com `timeZone` explícito pra calcular "hoje" sem a armadilha de fuso já documentada em `format-date.ts` — nunca `new Date(dateOnlyString)`).
  - Compressão de imagem pré-upload (`src/lib/images/compress-image.ts`, canvas nativo — `createImageBitmap` + resize + reencode JPEG qualidade 0.75, máximo 1600px no lado maior — sem dependência nova). Qualquer falha cai no arquivo original, nunca bloqueia o upload. **Verificado**: arquivo de teste de 26,3 MB (ruído aleatório 3000×3000, pior caso de compressão) reduzido a 1,17 MB (~22×) e confirmado chegando no Storage (`storagePath` preenchido).
  - Revisão de queries/índices: nenhum N+1 real encontrado (os únicos loops fora de `pull-sync.ts`/`sync-engine.ts`, sequenciais por design offline, são agregação em memória sobre lotes já buscados). Única lacuna real: `work_orders` sem índice em `client_id`, usado tanto por `listWorkOrders` (filtro opcional) quanto por `findEligibleWorkOrders` da consolidação de PMOC (sempre filtra `client_id`+`status`+`finished_at`) — índice composto `(client_id, status, finished_at)` em `0038_indexes_performance.sql`.
  - Acessibilidade: `aria-label` no botão de refresh do `SyncStatusBadge` (antes só `title`); textos `sr-only`/visíveis em inglês herdados dos primitivos shadcn traduzidos (`Close`→`Fechar` em `dialog.tsx`/`sheet.tsx`, `Toggle Sidebar`→`Abrir/fechar barra lateral` em `sidebar.tsx`) — inconsistência de idioma numa interface majoritariamente PT-BR.
  - Revisão sistemática de RLS: leitura de todas as 7 migrations de RLS (`0004`, `0011`, `0014`, `0021`, `0029`, `0032`, `0035` + as novas desta fase) contra a tabela da seção 9. **Nenhum problema encontrado** — toda tabela de tenant com RLS habilitada, dupla-permissão consistente, storage policies corretas nos dois buckets, nenhuma policy `using (true)` não-intencional. Reportado como está, sem inventar achados.
  - Pontos de extensão (campos nullable de `pmocs`) reconfirmados abertos, nenhuma ação de código necessária.

Verificado: `npm run build --webpack` + `npm run lint` limpos em cada sub-fase; fluxo manual completo (auditoria capturando eventos reais incluindo o retrofit em `invites`; override de permissão persistindo e sendo bloqueado de verdade; card "OS atrasadas" renderizando sem erro; compressão de imagem confirmada ponta a ponta via inspeção direta do IndexedDB); RLS/permissão re-verificados nos checkpoints 7.1/7.2 com o mesmo rigor das fases anteriores.

### FASE 8 — Simplificação de UX ✅ concluída

Primeira fase motivada por **uso real em produção**, não pelo roadmap original. Depois do deploy, o feedback do usuário foi que o app tinha ficado burocrático: o admin caía num painel de indicadores que não ajudava a trabalhar, distribuir serviço exigia navegar por três telas, cadastrar a estrutura física de um cliente eram quatro diálogos avulsos em ordem não óbvia, e o convite de técnico pedia repassar uma URL quando o usuário só queria repassar um código. **Nenhuma migration nesta fase** — o modelo de dados já cobria tudo; o problema era de apresentação.

- **Home = fila de trabalho.** `/dashboard` deixou de ser a tela inicial (continua no menu, no fim da lista, como consulta de panorama); `/minhas-atividades` virou a home, rotulada "Início". Todos os apontamentos para `/dashboard` migraram: `proxy.ts`, `app/page.tsx`, `manifest.ts` (`start_url`), e os `redirect()` de login/criação de empresa/ativação de convite.
- **Uma rota, duas visões, por permissão** (`minhas-atividades/page.tsx`): quem tem `assign_tickets` ou `manage_work_orders` vê `FilaDeTrabalho` (`features/dispatch/`), **server-rendered**; o técnico continua vendo `MinhasAtividadesList`, **local-first (Dexie)**, caminho inalterado. Decisão deliberada de não unificar: a fila do despachante é ação online por natureza (escopo já fixado na Fase 6) e misturá-la no componente offline arriscaria a garantia mais frágil do sistema.
- **`features/dispatch/queries.ts`** — `listDispatchQueue()` funde chamados não-fechados, OS em aberto e preventivas ainda sem OS numa lista só, ordenada por urgência. Reaproveita `listTickets`/`listWorkOrders`/`listPreventivePlans` e agrega **em memória** (mesmo critério da revisão de queries da Fase 7.3; dataset de um hospital). `TicketListItem`/`WorkOrderListItem` ganharam `assignedUserId` (aditivo) para os seletores de designação funcionarem na linha. Nenhuma Server Action nova: designar reusa `assignTicket`/`assignWorkOrder`, e preventiva sem OS reusa `GenerateWorkOrderDialog`.
- **`toLocalDateString()` em `src/lib/today-date.ts`** — as três origens da fila misturam `timestamptz` (`opened_at`) e `date` puro (`scheduled_date`, `period_start`). Cortar o ISO com `.slice(0,10)` daria o dia em **UTC**: um chamado aberto às 23h de Brasília apareceria como do dia seguinte. Verificado na prática com um chamado aberto às 23:56 — a fila exibe a data correta.
- **Login**: `components/ui/password-input.tsx` (olho de mostrar/ocultar, `aria-label` alternando) nos três formulários de senha. A tela de login ganhou alternância "Tenho um código de convite" → o técnico digita o código ali mesmo e cria o acesso, sem link. `activateInvite` passou a ler `code` do FormData (normalizando caixa/espaços — é digitado à mão) em vez de receber por `bind`; `/ativar-convite/[code]` continua válida, só pré-preenchendo o campo. A divulgação voltou a ser o código (revertendo a apresentação do commit `5d68e64`).
- **Assistente de cadastro** (`/unidades/nova`, `features/units/components/unit-setup-wizard.tsx`): unidade → setores (pulável) → ambientes → equipamentos, encadeados, cada etapa **salvando na hora** pelas Server Actions já existentes (que passaram a devolver `createdId`/`createdName`, aditivo). Abandonar no meio deixa dados válidos — mesmo precedente do wizard de atendimento da Fase 4. Os diálogos avulsos na página da unidade continuam, para acrescentar coisas depois sem refazer o fluxo.

**Bug real de segurança encontrado no QA desta fase — banco local não era zerado na troca de usuário (defeito da Fase 6, não desta):** o IndexedDB é por **origem**, não por sessão, e `logout()` só derruba o cookie do Supabase. `pullTechnicianData()` filtra corretamente por `assigned_user_id`, mas grava com `bulkPut`, que **mescla** — nunca remove o que sobrou. Resultado: num tablet compartilhado (exatamente o cenário do hospital), o técnico seguinte enxergava os chamados e OS do anterior. Reproduzido ao vivo: recém-ativado, o técnico via um chamado atribuído ao admin; inspeção direta do IndexedDB confirmou `meta.userId` já trocado e a linha antiga sobrevivente. Pior que a exposição: itens de outbox do usuário anterior drenariam sob a sessão do novo, gravando no servidor em nome de quem não fez a edição. Corrigido com `resetLocalDbIfUserChanged()` (`pull-sync.ts`), que compara `meta.userId` com o usuário autenticado e zera **todas** as tabelas locais quando diverge — chamado no início de `drainThenPull()`, **antes do drain** (se rodasse só antes do pull, os itens do usuário anterior já teriam subido). Verificado: após o fix, o técnico vê "Nada atribuído a você" e o IndexedDB tem `tickets: []` com o catálogo de referência repopulado. **Lição:** `bulkPut` sincroniza conteúdo, não identidade — toda base local por origem precisa de um dono explícito e de invalidação na troca.

Verificado: `npm run build --webpack` + `npm run lint` limpos; fluxo manual completo em empresa de teste nova (assistente nas 4 etapas com hierarquia conferida na página da unidade; chamado aparecendo na fila com data correta e designação inline avançando `aberto`→`designado` sem sair da tela; convite gerado, código digitado em minúsculas com espaços no login e ativado; técnico caindo na visão local-first correta); troca de usuário no mesmo navegador testada nos dois sentidos, com inspeção direta do IndexedDB antes e depois do fix.

### FASE 9 — A visão do técnico ✅ concluída

A Fase 8 arrumou a home do administrador, mas a do técnico continuou sendo uma versão levemente filtrada da tela de admin: ele entrava vendo "Equipamentos", "Chamados" e "Ordens de serviço" no menu — todos **globais**, listando a empresa inteira, antes de ter uma única coisa atribuída. O modelo mental correto, definido pelo usuário: o técnico não navega catálogo; ele vê o que foi atribuído, entra na **unidade** daquele trabalho, e é lá que estão as preventivas, as corretivas e os equipamentos — inclusive cadastrar um aparelho que encontrou e não estava registrado.

- **Menu enxuto**: `dispatcherOnly` em `nav-items.ts` esconde as três listagens globais do técnico, que fica só com Início e Dashboard. É um flag de **público-alvo**, não de capacidade — `view_equipment`/`view_tickets`/`view_work_orders` são legitimamente dele (precisa delas para executar), e trocar o gate por uma permissão administrativa incidental ficaria ainda mais ambíguo depois que `create_equipment` passou a ser do técnico. `src/lib/auth/is-dispatcher.ts` centraliza a definição, consumida pelo menu **e** pela home — duas cópias da expressão sairiam de sincronia na primeira permissão nova. As rotas seguem acessíveis (o fluxo de atendimento vive sob `/ordens-servico/...` e precisa continuar alcançável; o dado já é escopado por RLS).
- **Início agrupado por unidade** (`minhas-atividades-list.tsx`): cabeçalho por unidade levando à página dela, e sob ele as OS e chamados.
- **Página da unidade do técnico** (`/minhas-atividades/[unitId]`, `unidade-tecnico-view.tsx`): rota nova, **não** reuso de `/unidades/[unitId]` — aquela exige `view_units`, é server-rendered e traz editar/inativar unidade e CRUD de setores, tudo sem sentido em campo. Local-first (Dexie), com guarda de escopo derivada do próprio cache: só abre se houver trabalho atribuído ali.
- **Cadastro de equipamento em campo, offline** (`features/equipment/offline-actions.ts` + `equipment-field-form-dialog.tsx`): migration `0040` concede `create_equipment` **e** `create_environments` ao RESPONSAVEL_TECNICO. A segunda entrou por necessidade de schema, não por escopo inflado: `equipment.environment_id` é NOT NULL, então sem poder criar a sala o cadastro morreria em qualquer ambiente ainda não registrado — o caso que motiva a funcionalidade. Só INSERT; corrigir/remover cadastro segue sendo do admin, garantido pela RLS. Quando a sala é criada junto, a ordem do outbox resolve a FK sozinha (drena por `createdAt`, ambiente antes do equipamento) — confirmado no QA.
- **Dexie v2**: tabela `environments`, `equipment` deixa de ser só-leitura, índices novos (`equipment.tag` e `workOrders.unitId`, exigidos pelos `where()` desta fase — Dexie não filtra campo não indexado). Migração automática, preserva os dados existentes.
- **Cache offline restrito às unidades atribuídas**: `pull-sync.ts` deriva os `unitId` das OS e chamados do técnico e filtra `equipment`/`environments` por eles. Antes o aparelho baixava o catálogo de equipamentos da **empresa inteira** — dado que ele não precisa e que fica guardado no dispositivo. Efeito colateral intencional: o chamado ad-hoc a partir do equipamento passa a cobrir só onde ele tem trabalho.
- **Dashboard do técnico = progresso** (`progresso-tecnico.tsx`): quantos equipamentos concluídos de quantos, por OS e no total, com barra feita em divs (o projeto não tem primitivo de progresso e não vale dependência nova — mesmo critério da compressão de imagem da Fase 7). O pull já traz os registros `completed`, então nada mudou na sincronização para isso.

**Dois defeitos reais encontrados no QA desta fase, ambos corrigidos:**

1. **Início e Dashboard discordavam.** O Início filtrava `maintenanceRecords` por `status = 'draft'`, então uma OS ainda **aberta** cujos equipamentos já foram todos atendidos desaparecia da tela inicial — enquanto o Dashboard continuava listando-a. Flagrado numa conta real: a técnica via "Nada atribuído a você" com duas OS abertas em nome dela, sem caminho para alcançá-las. Corrigido: o que define o grupo é a **OS estar em aberto**, não o estado dos registros; concluídos aparecem marcados, pendentes primeiro.
2. **Beco sem saída na tag duplicada.** `equipment.tag` é única por empresa e o aparelho do técnico não tem o catálogo completo, então a colisão só falha no drain. A mensagem tratada dizia "edite o cadastro" — mas o técnico **não tem `edit_equipment`** nem tela de edição: o item ficaria preso na fila tentando para sempre, com um erro sobre o qual ele não podia agir. Corrigido com `discardFailedEquipmentOffline()` + estado de erro na linha do equipamento e botão "Descartar", para refazer com outra tag. Há também uma checagem local prévia contra o que o aparelho conhece, que pega o caso comum sem ida ao servidor. **Lição:** mensagem de erro que promete uma ação precisa ser conferida contra as permissões de quem vai lê-la.

Verificado: `npm run build --webpack` + `npm run lint` limpos; menu do técnico conferido em conta real e de teste; fixtures com duas unidades/cinco ambientes/seis equipamentos e duas OS (preventiva e corretiva em unidades diferentes) para exercitar o agrupamento; QA "modo avião" completo do cadastro de equipamento **incluindo criar a sala na hora**, com inspeção do IndexedDB (ordem da fila correta) e confirmação server-side no Supabase de que ambiente e equipamento chegaram com os uuids gerados no aparelho, mais o ledger `sync_operations`; caso de tag duplicada reproduzido de ponta a ponta (erro legível → descarte → fila zerada); escopo do cache confirmado no IndexedDB (só as unidades atribuídas); não-regressão do admin conferida (menu completo e fila de trabalho intactos).

### FASE 10 — O atendimento do técnico ✅ concluída

A Fase 9 separou a **navegação** do técnico da do administrador. O **atendimento em si** continuou sendo o wizard genérico da Fase 4: a mesma tela para corretiva e preventiva, checklist e medições em toda OS, seis categorias de foto soltas, peça digitada à mão, laudo de cinco campos — e nenhum caminho para o técnico mexer no status da OS, o defeito flagrado no teste real da fase anterior. O usuário descreveu como o trabalho acontece, e são duas formas diferentes: a corretiva é um problema num aparelho; a preventiva é uma sala inteira, aparelho a aparelho.

- **Ciclo de vida** (`features/maintenance/offline-actions.ts`): "Iniciar atividade" move o `maintenance_record` **e** a OS (`aberta` → `em_andamento`, via `markWorkOrderInProgressOffline`, com `work_orders` entrando em `OutboxTable`); concluir um atendimento grava `maintenance_records.resolution` (`resolvido` | `aguardando_peca`, coluna nova em `0041`); a OS fecha por **botão explícito** do técnico (`completeWorkOrderOffline`). O fechamento manual foi decisão do usuário, e a contrapartida está na interface: `readyToClose()`/`waitingForParts()` (`offline-queries.ts`) destacam "pronta para fechar" na unidade e no Dashboard, porque sem esse empurrão volta exatamente o defeito da Fase 9 — OS esquecida aberta com todo o serviço feito. Um equipamento em `aguardando_peca` **não** conta como pronta.
- **Coluna nova em vez de enum ampliado**: `resolution` é coluna à parte porque `status in ('draft','completed')` é filtrado em muitos lugares (Início, Dashboard, PMOC, histórico do equipamento). `completed` segue significando "o técnico terminou a parte dele" e todos continuam corretos; ampliar o enum obrigaria a revisar cada filtro, com risco de um atendimento deixar de contar como feito em algum deles.
- **Navegação** — Início lista **só as unidades** com o resumo de cada uma (a Fase 9 listava as tarefas dentro do cartão; o usuário pediu para tirar, pensando em muitas unidades); a unidade virou um **menu** de Preventivas / Corretivas / Equipamentos; e duas rotas novas: `/minhas-atividades/[unitId]/corretivas` (linha com **setor · ambiente · tag**, sem marca/modelo — localização ajuda a achar o aparelho, ficha técnica não) e `/minhas-atividades/[unitId]/preventivas` (setores quando existem, ambientes quando não).
- **Corretiva** (`atendimento-corretiva.tsx`, na rota `atender/[maintenanceRecordId]` que já existia): chamado de origem + ficha do equipamento + iniciar + fotos + peças + laudo + resolução. **Sem checklist e sem medições.** Fotos com limite e obrigatoriedade **por categoria** (`ATTACHMENT_CATEGORY_RULES`) em vez da constante única de 2: equipamento (1, obrigatória), etiqueta (1, obrigatória), problema (2), problema resolvido (2), temperatura de insuflamento (1), de retorno (1), outros (5) — as quatro categorias novas entraram no `check` de `attachments` na `0041`. O botão virou um "+" que oferece **câmera** (`capture="environment"`) ou **galeria**. Vídeo fica fora, vai por WhatsApp.
- **Foto obrigatória avisa, não bloqueia** (decisão do usuário): `missingRequiredCategories()` mostra o que falta e o atendimento pode ser concluído assim mesmo. Travar a conclusão numa câmera que não abriu deixaria o técnico sem saída em campo.
- **Preventiva** (`ambiente-preventiva-view.tsx`, rota nova `/minhas-atividades/[unitId]/preventivas/[environmentId]`): a tela cobre **vários registros de uma vez**, e por isso não cabe em `atender/[maintenanceRecordId]` — aquela rota, quando a OS é preventiva, redireciona para cá (no cliente, a partir do Dexie: descobrir o tipo no servidor custaria rede numa tela que precisa abrir sem conexão). Iniciar em lote → por equipamento, tag + as cinco medições já listadas (`PREVENTIVE_MEASUREMENT_KEYS`, salvando ao sair do campo) + botão de impedimento → no fim, checklist por tipo → concluir ambiente.
- **Checklist por tipo de equipamento**: para cada tipo presente no ambiente, o template cujo `equipment_type` casa (texto normalizado — os dois lados são texto livre no schema). Um toque registra o item em **cada** equipamento daquele tipo, porque a resposta é gravada por equipamento (e precisa continuar sendo, senão o PMOC sairia com o checklist de um aparelho só) mas marcar cinco vezes a mesma coisa não descreve o trabalho. Desmarcar vira `nao_aplica`, não delete — não há policy de delete nessa tabela e "não avaliado" é informação verdadeira. Tipo sem template casado aparece dito com todas as letras. Para o admin acertar o texto, o formulário de template passou a oferecer os tipos que existem de fato no cadastro (`listEquipmentTypes()`), ainda aceitando um novo.
- **Impedimento** (`ImpedimentoDialog`): botão por equipamento que abre a corretiva ali mesmo — chamado + fotos do defeito + peça, tudo offline e **sem schema novo**. As fotos e a peça penduram no `maintenance_record` atual: `attachments.work_order_id` é NOT NULL e o chamado recém-aberto ainda não tem OS, e registrar o defeito na OS onde ele foi encontrado é o histórico correto.
- **Catálogo de peças** (`parts_catalog`, `0041`): `company_id` nullable = linha global do seed (mesmo precedente de `measurement_types`), semeado com as peças comuns de climatização; cada empresa acrescenta as suas em `/configuracoes/pecas` (permissão nova `manage_parts_catalog`). O campo "outra peça" continua no formulário — o catálogo cobre o comum, não fecha a porta para o incomum.
- **Laudo de três campos** (Diagnóstico, Recomendação, Observações). `cause_identified`/`service_performed` continuam no schema e no PDF; saíram da tela. `updateMaintenanceNarrativeOffline` passou a gravar **só os campos informados** — o payload fechado anterior apagaria essas duas colunas em qualquer registro que já as tivesse.

**Duas reversões conscientes de regras da própria arquitetura**, ambas consequência da forma nova das telas:

1. **Medição deixou de ser aditiva** (seção 12 dizia "nunca editada"). A preventiva virou uma grade preenchível, e sem UPDATE corrigir 22 para 24 gravaria uma segunda linha do mesmo tipo no mesmo registro — a tabela do PMOC teria dois valores para "temperatura de retorno" sem dizer qual vale. Policy de update em `measurements` na `0042`; delete continua fora.
2. **Anexo passou a aceitar delete** (0029 dizia "reenviar na mesma categoria é o caminho pra corrigir"). Com limite **1** nas categorias obrigatórias, esse caminho não existe mais: sem remover, a primeira foto ruim é definitiva. Policy de delete em `attachments` + em `storage.objects`, e `OutboxItem.operation` ganhou `"delete"` (no drain, o objeto do Storage sai **antes** da linha — na outra ordem o pior caso é um binário órfão invisível). `removeAttachmentOffline` não enfileira delete para foto que ainda não subiu: retira o insert pendente e o blob, senão o par insert+delete subiria a foto só para apagá-la.

**E duas reversões de decisões da Fase 9**, pedidas pelo usuário com um caso de uso que não existia antes — o técnico pode passar um dia só atualizando cadastro, sem OS atribuída:

3. **`/equipamentos` voltou ao menu do técnico** (era `dispatcherOnly`), agora ramificando por público como `/dashboard` e `/minhas-atividades`: o despachante mantém a tabela server-rendered, o técnico recebe `EquipamentosTecnicoView`, local-first, com busca e filtro por unidade.
4. **O cache voltou a ser da empresa inteira** — `pull-sync.ts` deixou de filtrar `equipment`/`environments` pelas unidades atribuídas, e ganhou `units`, `sectors` e `parts_catalog`. Com `unitIds` vazio (o dia de cadastro), a tela nasceria vazia. E `edit_equipment` foi concedido ao RESPONSAVEL_TECNICO (`0043`), o que também afrouxa o beco sem saída da tag duplicada: além de descartar, agora ele pode corrigir a tag — a mensagem do 23505 foi reescrita para oferecer as duas saídas.

**Defeito real encontrado no QA — a guarda otimista acusava conflito contra a própria edição anterior do aparelho.** Concluir um atendimento nunca chegava ao servidor: o item ficava preso na fila em erro permanente, e o técnico via "Erro de sincronização" sem nada a fazer. Causa: `completeMaintenanceRecordOffline` enfileira `guardUpdatedAt` com o `updated_at` que o aparelho conhece, mas "iniciar atividade" já tinha drenado antes e o trigger `set_updated_at` mudou esse valor no servidor — e a cópia local só é atualizada num **pull completo**, enquanto o poll de 30s (`requestSync`) apenas drena. A guarda enfileirada nunca muda, então cada tentativa dava o mesmo resultado, para sempre. A armadilha existia desde a Fase 6; a Fase 10 a tornou o caminho normal, porque concluir com resolução deixou de ser exceção. Duas correções em `sync-engine.ts`: (1) depois de gravar um `maintenance_records`, o drain relê `updated_at` e **reancora** a cópia local, de modo que a guarda passe a comparar contra o que este aparelho de fato acabou de escrever; (2) conflito virou `SyncConflictError`, que **sai da fila** em vez de virar erro com retry — insistir com uma guarda imutável é repetir o mesmo resultado indefinidamente — e avisa o técnico por toast, uma vez por drain, que a verdade do servidor foi recarregada. **Lição:** guarda de concorrência precisa de uma âncora que acompanhe as próprias escritas; se ela só é atualizada por um caminho que nem sempre roda, ela deixa de detectar conflito e passa a inventá-lo.

**Observação de operação encontrada durante a verificação:** rodando o código novo contra o banco ainda sem as migrations, o pull falhava (400/404 nas colunas e tabela novas) e **o aplicativo não dizia nada** — o `bulkPut([])` é inofensivo, o cache antigo continuava na tela e o selo dizia "Sincronizado". `reportPullErrors()` passou a registrar cada consulta que falha, para o descompasso ter nome no console em vez de mandar quem investiga procurar no lugar errado. A ordem de implantação importa: **migration antes do deploy**.

**Armadilha do processo de migration, encontrada da pior forma:** o arquivo único que é colado no SQL Editor (`supabase/migrations_fase*.sql`, gitignored) foi gerado concatenando as migrations com PowerShell, e o `Get-Content` do Windows PowerShell 5.1 lê arquivo UTF-8 **sem BOM** usando a codepage ANSI. Os acentos saíram duplamente codificados e foram parar no banco: "Gás refrigerante" virou "GÃ¡s refrigerante", "°C" virou "Â°C". As migrations no repositório estavam corretas o tempo todo — só o arquivo colado não estava, e o estrago ficou nos dados, não no código. Corrigido por UPDATE nas linhas afetadas. **Gerar esse arquivo com `node` (que lê e escreve UTF-8 por padrão), nunca com `Get-Content`/`Set-Content`.**

**Deixado de fora de propósito:** a preventiva não tem seção de fotos nem laudo (a especificação pediu medições, checklist e o botão de corretiva) — consequência real: num PMOC só de preventivas os campos narrativos saem vazios, e vale decidir na fase do administrador se cabe uma observação por ambiente. As categorias `antes`/`depois` saíram da UI do técnico mas continuam válidas no banco.

### FASE 11 — O celular do técnico ✅ concluída

Segunda fase inteiramente motivada por uso real: o usuário testou a Fase 10 **no celular**, que é onde o técnico de fato trabalha, e o que voltou foram defeitos de percurso, não de funcionalidade. Nenhuma migration — o modelo de dados já cobria tudo.

- **A unidade virou três divisões** (`unidade-tecnico-view.tsx`, abas Em aberto / Impedimentos / Concluídos). A divisão mora na unidade, não no Início, pelo motivo que o usuário deu: com muitas unidades, no Início ela só somaria números de lugares diferentes. `offline-queries.ts` foi reescrito em volta disso: `loadWorkByUnit()` (substitui `loadOpenWorkByUnit`) passa a trazer **também o trabalho fechado**, e `bucketOfRecord()` classifica cada atendimento. Antes a unidade sumia do Início junto com a última OS fechada, levando embora o único caminho que o técnico tinha para rever ou corrigir o próprio registro.
- **Aguardando peça é impedimento, não pendência.** Era o ponto mais concreto do retorno: a corretiva com peça pedida continuava contando como trabalho a fazer no Início, como se ele ainda tivesse o que fazer ali. `bucketOfRecord` resolve isso num lugar só, e as listas de corretivas/preventivas passaram a mostrar apenas o balde "aberto" — cada aparelho aparece em exatamente uma divisão.
- **Editar depois de concluir.** Enquanto a OS estiver aberta, medições, checklist, fotos, laudo e o próprio desfecho continuam editáveis (`RecordConclusion` volta a perguntar, com o botão "Atualizar desfecho" — é assim que ele registra que a peça chegou). Fechada a OS, as telas abrem em modo leitura, dito com todas as letras ("OS fechada"), porque a partir dali o dado já é candidato à consolidação de PMOC. Reabrir é do administrador.
- **Impedimento na fila do administrador** (`listDispatchQueue` + `countWaitingPartsByWorkOrder`): a linha da OS ganhou "N aguardando peça" e sobe no ranque junto com as atrasadas. É pendência do administrador, não do técnico — ele já fez o que podia. Antes só se descobria abrindo a OS.
- **O cartão de origem diz quem e quando.** "Esta OS não veio de um chamado — foi aberta direto pelo administrador" era verdadeiro e anônimo. Agora mostra o nome de quem abriu (o chamado, via `tickets.opened_by_user_id`; ou a OS, via `work_orders.created_by`) e a data/hora. Exigiu dois embeds com FK explícita no pull (`users!tickets_opened_by_user_id_fkey`, `users!work_orders_created_by_fkey` — as duas tabelas têm mais de uma FK para `users`) e dois campos novos no cache (`OfflineTicket.openedByName`, `OfflineWorkOrder.createdByName`). Nenhuma migração de Dexie: campo sem índice não muda o schema.

**Reversão consciente da Fase 10 — foto obrigatória voltou a bloquear.** A Fase 10 tinha decidido *avisar e deixar concluir*, com o argumento de não prender o técnico em campo por uma câmera que não abriu. O usuário reverteu depois de usar a tela: o aviso era ignorado, e a foto do equipamento e a da etiqueta são justamente o que prova no PMOC que o aparelho certo foi atendido. Agora travam **concluir e solicitar peça** (`ATTACHMENT_CATEGORY_RULES[c].required`, checado em `RecordConclusion` e no botão de peça). A frase explicativa acima das fotos saiu — o bloqueio já diz o que falta, no momento em que importa.

**Peça virou botão, e decide o desfecho.** O formulário sempre aberto virou `PartsRequestDialog`: no celular ele ocupava a altura entre as fotos e o laudo mesmo nas corretivas em que nenhuma peça é necessária, que são a maioria. O que fica visível é a lista do que já foi pedido. E a resolução deixou de ser uma pergunta solta: peça solicitada **trava** em "aguardando peça" (perguntar seria perguntar o que já se sabe), e escolher "aguardando peça" sem ter pedido nada abre o diálogo e rola até a seção — um impedimento sem peça nomeada não dá ao administrador nada com que trabalhar.

**Navegação de celular.** `MobileTabBar` (Início / Equipamentos / Dashboard, ícones, fixa embaixo, `md:hidden`) substitui a gaveta lateral para o técnico — os itens saem do mesmo `primaryNavItems`, filtrados pelas mesmas regras, porque uma lista paralela sairia de sincronia na primeira tela nova. O botão de abrir a gaveta some no celular para não ser um segundo caminho às mesmas três telas; no desktop o menu lateral continua. E `PageBackHeader` deu um botão de voltar de verdade a todas as telas de campo, no lugar da trilha de links pequenos: o destino é explícito (`href`, não `history.back()`), senão chegar por link direto ou recarregar deixaria o botão sem para onde ir — e instalado como PWA em tela cheia não há gesto de voltar do navegador.

**Detalhe de comportamento:** as abas abrem na primeira divisão que tem algo a mostrar (aberto → impedimento → concluído). Cair numa aba vazia com trabalho ao lado é fazer o técnico procurar.

Verificado: `npm run build --webpack` + `npm run lint` limpos; fluxo conferido no navegador em viewport de celular (375×812) com a conta de teste — Início listando as duas unidades com os selos novos ("4 concluídos", "2 impedimentos"), a aba Impedimentos trazendo os dois aparelhos com localização e tag, a aba Concluídos alcançando a preventiva de OS já fechada, essa tela abrindo com as dez medições desabilitadas e sem nenhum botão de ação, o cartão de origem exibindo "aberta por Admin Teste Fase8 em 17/08/2026 às 11:18", e "Solicitar peça"/"Atualizar desfecho" ambos desabilitados por falta das duas fotos obrigatórias; barra inferior renderizando e o gatilho da gaveta com `display:none` no celular. O indicador da fila do administrador teve o **dado** conferido no Supabase (2 registros `aguardando_peca` numa OS `em_andamento`, que é o que a linha vai exibir) mas **não** a renderização — trocar de conta exigia clicar no menu do usuário, e a automação de clique do navegador não respondeu nesta sessão.

### FASE 12 — Ajustes do teste no celular ✅ concluída

Lista de acertos que o usuário levantou usando a Fase 11 no aparelho, item a item, na mesma sessão. Nenhuma migration — as colunas envolvidas (`maintenance_records.status`/`resolution`) já aceitam todos os valores usados aqui desde a Fase 10.

**A mudança de regra: aguardando peça agora trava o atendimento.** A Fase 11 tinha dado ao técnico o botão "Atualizar desfecho" para ele mesmo registrar que a peça chegou. O usuário reverteu: quem sabe se a peça chegou é o administrador, e reabrir um serviço que depende de material que não chegou não muda nada. Então o registro fechado como `aguardando_peca` fica **somente leitura** para o técnico — fotos, laudo, peça e desfecho — com um cartão dizendo o que está acontecendo e quem destrava. Do outro lado, a página da OS ganhou **"Liberar para o técnico"** (`features/maintenance/actions.ts`, recriado nesta fase só para o fluxo administrativo, e `ReopenRecordButton`): volta o registro para `draft`, limpa `resolution` e `completed_at`, e reabre a OS se ela já tinha sido fechada — senão o serviço voltaria a existir dentro de uma OS que diz o contrário. Nada do que já foi preenchido se perde: ele retoma de onde parou. É a tradução literal de "só poderá ser alterado novamente após o administrador atribuir novamente aquele chamado para o técnico".

**E a reversão contrária, no mesmo dia: OS fechada não trava mais nada.** A Fase 11 tinha colocado a preventiva e a corretiva em modo leitura quando a OS fechava, com o argumento da consolidação de PMOC. O usuário desfez com um caso concreto — "pode ser que o técnico esqueceu de preencher algo" — e ele está certo: quem tem como corrigir é quem esteve lá. O selo "OS fechada" continua na tela, agora como informação e não como cadeado. Sobrou uma única trava no fluxo do técnico, a de aguardando peça, e ela tem dono explícito para destravar.

Os demais itens, todos de percurso:

- **Cartão de origem** — as duas frases (com e sem chamado) viraram uma: `Chamado aberto por <nome> em <data> às <hora>`.
- **Botão de voltar** — era um link de texto com ícone de 16px; virou alvo de 44px com borda, o mínimo recomendado para o dedo.
- **"Equipamentos" saiu de baixo das abas** e entrou na aba "Em aberto": repetido nas três divisões, virava ruído.
- **As abas sempre abrem em "Em aberto"** (a Fase 11 escolhia a primeira aba com conteúdo). A tela mudava de cara de uma unidade para outra e o técnico perdia a referência.
- **Vazio de impedimentos** — "Nenhum impedimento ou equipamento aguardando peça nesta unidade."
- **Selo de sincronização com data** — "Sincronizado · hoje 22:54", ou `dd/MM HH:mm` quando não é hoje. O selo respondia "deu certo?" mas não "de quando é o que estou vendo?", que é a pergunta de quem passa o dia em campo sem sinal.

Verificado: `npm run build --webpack` + `npm run lint` limpos; conferido em viewport de celular com a conta de teste — a unidade abrindo em "Em aberto" com o menu de Equipamentos dentro dela, o selo mostrando "hoje 22:54", o atendimento travado exibindo o cartão de bloqueio com os três campos de laudo desabilitados e nenhum botão de ação, o botão de voltar medindo 44px de altura, e a página da OS listando os dois equipamentos como "Aguardando peça". O botão "Liberar para o técnico" foi conferido pelo **avesso**: aberto com a conta do técnico, a linha mostra o selo e **não** mostra o botão, que é o gate de `manage_work_orders` funcionando; a renderização com a conta de administrador não foi vista nesta sessão porque a automação de clique do navegador não respondeu para trocar de conta.

### Fora de escopo do MVP (explícito no briefing original)
Billing/assinatura, controle de estoque, portal do cliente, QR codes, integração WhatsApp API, push notifications nativas, assinatura digital/e-signature, exportação de laudo em PDF avulso (fora do fluxo de PMOC), apps nativos (iOS/Android) — só PWA. Arquitetura deliberadamente deixa pontos de extensão (campos nullable, FKs opcionais) para que nenhum desses itens exija migração destrutiva quando for priorizado.

---

## Arquivos críticos

- `supabase/migrations/*.sql` — fonte de verdade do schema; `supabase/migrations_combined.sql` (gitignored) é gerado sob demanda pra colar no SQL Editor, já que o projeto Supabase não está linkado via CLI (`supabase link`) — credenciais foram coladas manualmente em `.env.local`.
- `src/types/database.types.ts` — escrito à mão (não `supabase gen types`, pelo motivo acima); precisa declarar `Relationships` reais por tabela, senão `.select()` com joins embutidos (`unit:units(name)`) não tipa (causa raiz de um bug real da Fase 1).
- `src/lib/supabase/server.ts` — padrão de cliente Supabase SSR usado por toda Server Action e RSC.
- `src/proxy.ts` — refresh de sessão + gate de proteção de rota para toda a árvore `(app)`.
- `src/lib/auth/permissions.ts` — wrapper de `has_permission()` consumido por nav/UI e reverificado server-side em toda Server Action.
- `src/lib/hooks/use-close-on-success.ts` — fecha Dialog após Server Action bem-sucedida sem `useEffect` (o lint do projeto proíbe `setState` síncrono em effect — usa o padrão "ajustar estado durante a renderização").
- `src/lib/offline/db.ts` — schema Dexie, âncora da implementação offline-first da Fase 6.
- `vercel.json` — fixa `buildCommand: "npm run build"` explicitamente. Sem isso, o preset zero-config do Vercel para Next.js pode rodar `next build` direto (Turbopack por default no Next 16), quebrando o Serwist — mesma restrição já documentada na seção 1/11 (`--webpack` obrigatório).

---

## Convenções que valem para todas as fases futuras

- Migrations em pares: criação de tabela(s) primeiro, RLS depois, num arquivo separado (`NNNN_rls_*.sql`) — mais fácil revisar o que é schema vs. autorização.
- `features/<domínio>/{schema.ts, actions.ts, queries.ts, components/}` — zod em `schema.ts`, Server Actions com `useActionState` em `actions.ts` (sempre `requireUser()` + `assertPermission()` antes de qualquer mutação), leituras server-only em `queries.ts`.
- Todo Dialog de criar/editar segue o padrão `useActionState` + `useCloseOnSuccess`; toda ação de "excluir" é soft-delete (update), nunca `DELETE` real.
- Nenhuma feature nova entra em `nav-items.ts` sem `requiredPermission`; itens de fase futura ficam com `comingSoon: true` até serem implementados.
- Não inventar requisito técnico não validado (ex: tipos de medição, itens de checklist) — manter extensível (linhas novas, não enum fixo) em vez de hardcode ou pergunta especulativa ao usuário.
