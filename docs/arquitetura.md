# PMOC+ — Documento de Arquitetura

> Este documento é a fonte permanente das decisões de arquitetura do projeto — schema, RLS, permissões, offline-first, plano de fases. Antes vivia só num arquivo de plano fora do repositório (`~/.claude/plans/`); foi portado para cá em 2026-08-16 para não depender de estado local do Claude Code. Mudanças de arquitetura devem ser refletidas aqui, não só no histórico de conversas.

## Status atual

| Fase | Escopo | Status |
|---|---|---|
| 0 | Este documento de arquitetura | ✅ Concluída |
| 1 | Fundação — auth, multi-tenancy, RLS, permissões, app shell, PWA | ✅ Concluída (commit `84bac90`) |
| 2 | Estrutura operacional — clientes, unidades, setores, ambientes, equipamentos | ✅ Concluída (commit `f5eebed`) |
| 3 | Chamados | ✅ Concluída (commit `6b90296`) |
| 4 | Manutenção (OS, preventivas, checklist, medições, anexos, peças) | ⏳ Pendente |
| 5 | PMOC (consolidação + PDF) | ⏳ Pendente |
| 6 | Offline-first (Dexie + sync) | ⏳ Pendente |
| 7 | Refinamento | ⏳ Pendente |
| — | Deploy inicial no Vercel | ⏳ Adiado a pedido do usuário — repo pronto (`npm run build --webpack` limpo), só falta configurar env vars no Vercel e apontar o projeto |

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

**`features/` implementados:** `auth`, `companies`, `users`, `invites` (Fase 1); `clients`, `units` (cobre também `sectors`/`environments`), `equipment` (Fase 2); `tickets` (Fase 3).

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

**maintenance_records** *(Fase 4)* — id, company_id, work_order_id, equipment_id, technician_user_id, status (`draft`|`completed`), cause_identified, service_performed, recommendation, notes, diagnosis, started_at, completed_at, timestamps. **O "laudo" não é uma tabela separada** — é o conjunto de campos narrativos aqui, renderizado junto com medições/fotos/checklist na hora de visualizar ou consolidar PMOC.

**measurement_types** *(Fase 4)* — id, company_id? (null = default global), key (`temperatura`, `corrente`, `tensao`, `pressao`), label, unit_default, data_type (`numeric`|`text`), is_active.

**measurements** *(Fase 4)* — id, company_id, maintenance_record_id, measurement_type_id, value_numeric?, value_text?, unit, note, created_by.

> **Recomendação sobre flexibilidade de medições:** tabela de tipos (`measurement_types`) + `measurements` com colunas reais tipadas, **não** JSONB solto nem EAV livre. JSONB dificulta agregação para consolidação de PMOC/dashboards; a tabela de tipos permite adicionar novos tipos futuramente como **linhas novas** (zero migração), mantendo `value_numeric`/`unit` consultável.

**attachments (fotos)** *(Fase 4)* — id, company_id, work_order_id, maintenance_record_id?, equipment_id, category (`equipamento`|`etiqueta`|`problema`|`antes`|`depois`|`outro`), storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at. Limite de 2 fotos/categoria validado na **camada de aplicação**, não como constraint rígida de banco.

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
- **Nota de verificação:** registro do service worker não foi confirmável no navegador sandboxed usado durante o desenvolvimento (fetch do `/sw.js` funciona, `register()` falha silenciosamente) — headers/conteúdo/status confirmados corretos via curl direto; deve funcionar normalmente num navegador real/produção. Confirmar após o deploy no Vercel.

---

## 12. Offline-first (decisão crítica, Fase 6 — não implementado ainda)

**Recomendação: Dexie.js (IndexedDB) + outbox/fila de sincronização feita à mão, não WatermelonDB/RxDB/PowerSync, no MVP.**

- **WatermelonDB**: construído em torno de bindings nativos (React Native/SQLite); adapter web é caminho secundário, mal suportado. Não recomendado aqui.
- **RxDB**: capaz, mas mais pesado, curva de aprendizado maior, e recursos relevantes (replicação de anexos, alguns plugins de conflito) ficam em tier pago ou pouco testados em produção. Overkill para MVP de um único tenant.
- **PowerSync**: provavelmente a resposta "certa" a longo prazo (integração oficial com Supabase para exatamente este problema), mas exige subir/pagar o serviço PowerSync antes mesmo de a Fase 1 ter usuário validado. **Revisitar explicitamente na Fase 6** se o Dexie feito à mão mostrar limites reais.
- **Dexie**: leve, mantido ativamente, `liveQuery`/hooks React de primeira classe, sem infra paga, escolha adequada e "chata" (no bom sentido) para a escala real (um hospital, poucos técnicos).

**Decisão de schema já tomada** (todas as PKs relevantes já são UUID): toda tabela gravável offline (tickets, work_orders, maintenance_records, measurements, attachments-metadados, parts_requests, respostas de checklist) deve usar **PK UUID gerável no cliente** (default `gen_random_uuid()` no servidor, mas o cliente pode fornecer seu próprio UUID no insert). É a espinha dorsal de idempotência: registro criado offline gera o UUID no dispositivo, salvo no Dexie sob esse id, depois enviado via `upsert(... on conflict (id) do update)` — retries são naturalmente idempotentes porque a PK nunca muda.

**Outbox** (planejado): tabela Dexie `outbox`: `{id, entity_type, entity_id, operation: create|update|soft_delete, payload, created_at, attempt_count, last_error, status: pending|syncing|synced|error}`. Toda leitura na UI do técnico deve passar pelo Dexie (`useLiveQuery`), nunca direto no Supabase — offline é o caminho padrão, não um fallback.

**Conflitos**: cada OS/maintenance_record é essencialmente single-writer (o técnico designado). Estratégia planejada: **concorrência otimista com update guardado** para transições de status; **last-write-wins por timestamp de servidor** para campos narrativos; **aditivo, sem disputa** para fotos e medições.

**Ressalva de plataforma crítica**: iOS Safari (relevante para iPads/iPhones do hospital) tem suporte historicamente limitado/inexistente à Background Sync API. O motor de sync não pode depender só dela — disparar sync em foreground/`visibilitychange`, em eventos `online`, e com fallback de polling em foreground.

---

## 13. Sincronização (Fase 6 — não implementado ainda)

Estados visíveis na UI (badge no topbar, hoje placeholder estático "Online" em `SyncStatusBadge`): `Offline`, `Online`, `Sincronizando`, `Sincronizado`, `Erro de sincronização` — de uma store client-side combinando `navigator.onLine`, eventos `online`/`offline` e tamanho da fila do outbox.

Fluxo planejado: reconexão (ou app em foreground) → `drainOutbox()` → processa a fila **em ordem de dependência** → cada item enviado via `upsert` idempotente ou RPC SECURITY DEFINER → sucesso marca `synced`; falha incrementa `attempt_count`, aplica backoff exponencial. Server-side, ledger `sync_operations` (constraint unique em `idempotency_key`) protege contra aplicação duplicada.

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

**Implementado na Fase 2** para clients/units/sectors/environments/equipment via `audit_trigger_fn()` genérico (SECURITY DEFINER, `AFTER INSERT OR UPDATE`, grava `to_jsonb(OLD)`/`to_jsonb(NEW)`). Verificado via query direta: `entity_type`, `entity_id`, `user_id`, `previous_data`/`new_data` todos corretos.

**Pendente:** retrofit do trigger em companies/users/invites; captura em camada de aplicação para eventos de negócio sem CRUD simples ("PMOC gerado", "convite ativado", "permissão alterada manualmente"); UI de visualização (`/auditoria`, hoje só o item de nav reservado) — tudo isso é Fase 7.

**Soft-delete**: tabelas operacionais e units/sectors/environments/equipment recebem `deleted_at`, `deleted_by` (clients usa só `status`, ver seção 3). Nenhuma policy de RLS de `delete` é concedida a ninguém — a ação "excluir" na aplicação é sempre um update (`set deleted_at = now(), deleted_by = ...` ou `set status = 'inactive'`), que também é auditado pelo trigger. Leituras/listas filtram `deleted_at is null` por default. Purge definitivo fica fora do escopo do MVP.

---

## 15. Plano de implementação por fases

### FASE 1 — FUNDAÇÃO ✅ concluída

Auth completo (login, criação de empresa, convite/ativação de técnico), multi-tenancy + RLS base, catálogo de permissões, app shell com nav sensível a permissão, dashboard shell, PWA base (manifest + Serwist). RLS smoke test com 2 empresas de teste passou. `npm run build --webpack` limpo.

### FASE 2 — Estrutura operacional ✅ concluída

Hierarquia física completa: Cliente → Unidade → Setor (opcional) → Ambiente → Equipamento. CRUD das 5 entidades com formulários em cascata, navegação da hierarquia por páginas de detalhe, gestão de status de equipamento (4 estados), auditoria ligada aos 5 cadastros. Verificado: build/lint limpos, fluxo manual completo, RLS confirmado com empresa nova (lista vazia + 404 em acesso direto), auditoria confirmada via query direta, permissões confirmadas com Responsável Técnico (nav filtrada, `/clientes`/`/unidades` bloqueados, `/equipamentos` só leitura).

### FASE 3 — Chamados ✅ concluída

CRUD de chamados, workflow de status (aberto→designado→em_atendimento→aguardando_peça/cliente→concluído/cancelado) com timeline derivada de `audit_logs` via RPC `get_ticket_timeline` (escopada por `view_tickets`, não `view_audit_log` — evita exigir permissão de auditoria completa só para ver o histórico do próprio chamado), criação pelo admin (cascata cliente→unidade→setor?→ambiente?→equipamento?) e pelo técnico (ad-hoc a partir do equipamento, localização resolvida no servidor), atribuição (avança `aberto`→`designado` automaticamente), view "Minhas atividades" (chamados do técnico logado, ainda abertos). `equipment_id`/`work_order_id` nullable desde já — `work_order_id` fica sem FK até a Fase 4 criar `work_orders` (migração aditiva). Verificado: build/lint limpos, fluxo manual completo (admin e Responsável Técnico), RLS confirmado com empresa nova (lista vazia + 404 em acesso direto), permissões do técnico corretas (cria chamados, não edita/atribui, timeline visível sem `view_audit_log`).

### FASE 4 — Manutenção (a fazer)
Geração de OS (de chamado = corretiva; de preventive_plans = preventiva agrupada), CRUD de preventivas + geração de OS, fluxo de atendimento em etapas com salvamento incremental, templates/itens/respostas de checklist, seed de measurement_types + registro de medições, upload no Storage com limite por categoria, fluxo administrativo de solicitação de peças, histórico completo do equipamento (hoje um placeholder vazio em `/equipamentos/[id]`).

### FASE 5 — PMOC (a fazer)
Consolidação por cliente/período entre unidades, UI de geração, PDF via `@react-pdf/renderer` com campos futuros extensíveis já presentes (mas em branco), armazenamento do PDF gerado, download manual, dashboard de status do PMOC com dados reais.

### FASE 6 — Offline-first (a fazer)
Schema Dexie completo + outbox + motor de sync (seções 12/13), UI do técnico reescrita para ler/escrever local-first, estados de sync visíveis, banners de conflito, upserts/RPCs idempotentes, QA em modo avião iOS/Android. Revisitar PowerSync se o Dexie feito à mão se mostrar insuficiente em escala real.

### FASE 7 — Refinamento (a fazer)
Polimento de UX, performance (otimização de queries, compressão de imagem pré-upload), acessibilidade, widgets de dashboard mais ricos porém não decorativos, UI de visualização de auditoria, polimento da UI de permissões, revisão de RLS/segurança, documentação, confirmação de que os pontos de extensão (campos nullable já presentes) seguem abertos para os itens futuros fora de escopo — cobrança, estoque, portal do cliente, QR, WhatsApp API, push, assinatura digital — sem exigir migração destrutiva.

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
- `src/lib/offline/db.ts` — schema Dexie, âncora da implementação offline-first da Fase 6 (ainda não existe).

---

## Convenções que valem para todas as fases futuras

- Migrations em pares: criação de tabela(s) primeiro, RLS depois, num arquivo separado (`NNNN_rls_*.sql`) — mais fácil revisar o que é schema vs. autorização.
- `features/<domínio>/{schema.ts, actions.ts, queries.ts, components/}` — zod em `schema.ts`, Server Actions com `useActionState` em `actions.ts` (sempre `requireUser()` + `assertPermission()` antes de qualquer mutação), leituras server-only em `queries.ts`.
- Todo Dialog de criar/editar segue o padrão `useActionState` + `useCloseOnSuccess`; toda ação de "excluir" é soft-delete (update), nunca `DELETE` real.
- Nenhuma feature nova entra em `nav-items.ts` sem `requiredPermission`; itens de fase futura ficam com `comingSoon: true` até serem implementados.
- Não inventar requisito técnico não validado (ex: tipos de medição, itens de checklist) — manter extensível (linhas novas, não enum fixo) em vez de hardcode ou pergunta especulativa ao usuário.
