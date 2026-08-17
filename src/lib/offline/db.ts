import Dexie, { type EntityTable } from "dexie";

/**
 * Banco local (IndexedDB via Dexie) — âncora da Fase 6 (offline-first).
 * **Client-only**: nunca importar este módulo de um Server Component/Action
 * (`indexedDB` não existe no runtime do servidor). Só as telas do técnico
 * (`/minhas-atividades`, atendimento, chamado ad-hoc) o consomem — telas de
 * admin continuam 100% online via Server Actions, decisão de escopo da
 * Fase 6 (ver docs/arquitetura.md seção 12).
 *
 * Tabelas graváveis offline usam PK = `id` (uuid) sempre gerado no cliente
 * (`crypto.randomUUID()`) — mesma decisão de schema da Fase 1 (seção 12):
 * o id nasce definitivo, cliente e servidor compartilham a mesma chave, o
 * que torna o upsert de sincronização idempotente por construção.
 *
 * Tabelas de referência (workOrders, units, sectors, partsCatalog,
 * checklistTemplates*, measurementTypes) são só-leitura do ponto de vista da
 * UI — populadas inteiramente por `pull-sync.ts`, nunca editadas localmente.
 * `equipment` e `environments` são as exceções: viraram graváveis na Fase 9
 * (cadastro em campo) e editáveis na Fase 10.
 */

export type OfflineWorkOrder = {
  id: string;
  title: string;
  type: "corretiva" | "preventiva";
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";
  clientId: string;
  clientName: string;
  unitId: string;
  unitName: string;
  assignedUserId: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  originTicketId: string | null;
  createdAt: string;
};

export type OfflineMaintenanceRecord = {
  id: string;
  workOrderId: string;
  equipmentId: string;
  equipmentTag: string;
  technicianUserId: string | null;
  technicianName: string | null;
  status: "draft" | "completed";
  /** Fase 10 — como o técnico fechou: resolvido ou aguardando peça. Null enquanto rascunho. */
  resolution: "resolvido" | "aguardando_peca" | null;
  causeIdentified: string | null;
  servicePerformed: string | null;
  recommendation: string | null;
  diagnosis: string | null;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  /** Timestamp de servidor no momento do último pull — base da guarda de concorrência otimista no drain. */
  updatedAt: string;
};

export type OfflineChecklistItem = {
  id: string;
  maintenanceRecordId: string;
  templateItemId: string | null;
  labelSnapshot: string;
  status: "ok" | "nao_ok" | "nao_aplica";
  note: string | null;
};

export type OfflineMeasurement = {
  id: string;
  maintenanceRecordId: string;
  measurementTypeId: string;
  typeLabel: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  note: string | null;
  createdAt: string;
};

export type OfflinePartsRequest = {
  id: string;
  workOrderId: string;
  maintenanceRecordId: string | null;
  partName: string;
  quantity: number;
  note: string | null;
  status: string;
  requestedByName: string;
  createdAt: string;
};

export type OfflineAttachment = {
  id: string;
  workOrderId: string;
  maintenanceRecordId: string | null;
  equipmentId: string;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** null até o outbox terminar de subir o blob pro Storage. */
  storagePath: string | null;
  createdAt: string;
};

/** Blob real, tabela separada do metadado por peso — evita inflar leituras de `attachments`. */
export type OfflineAttachmentBlob = {
  id: string; // = attachments.id
  blob: Blob;
};

export type OfflineTicket = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  clientId: string;
  clientName: string;
  unitId: string;
  unitName: string;
  equipmentId: string | null;
  equipmentTag: string | null;
  openedByUserId: string;
  openedAt: string;
  workOrderId: string | null;
};

/**
 * Equipamentos da **empresa inteira**, não só das unidades atribuídas.
 *
 * A Fase 9 tinha apertado isso para as unidades com trabalho atribuído; a Fase
 * 10 reverte porque o técnico ganhou menu próprio de Equipamentos — o caso de
 * uso que o usuário descreveu é justamente ele passar um dia atualizando
 * cadastro, sem OS atribuída, e para isso precisa da planta toda no aparelho.
 * Gravável desde a Fase 9 (cadastro em campo) e editável desde a 10.
 */
export type OfflineEquipment = {
  id: string;
  tag: string;
  type: string | null;
  unitId: string;
  unitName: string;
  clientId: string;
  clientName: string;
  /** Sala onde está instalado — obrigatório no servidor (`equipment.environment_id` é NOT NULL). */
  environmentId: string;
  brand: string | null;
  model: string | null;
};

/**
 * Ambientes (salas). Entrou na Fase 9 porque `equipment.environment_id` é NOT
 * NULL: sem ambiente em cache (e sem poder criar um), cadastrar equipamento em
 * campo travaria em qualquer sala nova. Também gravável offline, pelo mesmo
 * motivo. Escopo acompanha `equipment` — empresa inteira desde a Fase 10.
 */
export type OfflineEnvironment = {
  id: string;
  unitId: string;
  sectorId: string | null;
  name: string;
};

/**
 * Unidades e setores entram na Fase 10 como referência só-leitura: a lista de
 * corretivas mostra **setor · ambiente · tag**, a preventiva agrupa por setor,
 * e o menu de equipamentos do técnico agrupa por unidade — nenhum dos três
 * consegue se resolver só com o nome desnormalizado que `equipment` carrega.
 */
export type OfflineUnit = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
};

export type OfflineSector = {
  id: string;
  unitId: string;
  name: string;
};

/** Peça pré-cadastrada, para o técnico selecionar em vez de digitar. */
export type OfflinePartCatalogItem = {
  id: string;
  name: string;
  unit: string | null;
};

export type OfflineChecklistTemplate = {
  id: string;
  name: string;
  maintenanceType: "preventiva" | "corretiva" | "ambos";
  /** Texto livre no schema — casado com `equipment.type` normalizado (Fase 10). */
  equipmentType: string | null;
};

export type OfflineChecklistTemplateItem = {
  id: string;
  checklistTemplateId: string;
  label: string;
  orderIndex: number;
};

export type OfflineMeasurementType = {
  id: string;
  key: string;
  label: string;
  unitDefault: string | null;
  dataType: "numeric" | "text";
};

export type OutboxTable =
  | "work_orders"
  | "maintenance_records"
  | "maintenance_record_checklist_items"
  | "measurements"
  | "parts_requests"
  | "attachments"
  | "tickets"
  | "equipment"
  | "environments";

/**
 * Um item por mutação offline, na ordem em que foi criada. `payload` já
 * vem em snake_case (formato que o Supabase espera), montado no momento do
 * `enqueue()` — o drain não faz transformação, só envia.
 */
export type OutboxItem = {
  id: string;
  entityTable: OutboxTable;
  entityId: string;
  /**
   * `delete` entrou na Fase 10, pela troca de foto: as categorias obrigatórias
   * passaram a ter limite 1, então substituir uma foto ruim exige remover a
   * anterior (linha + objeto no Storage).
   */
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  /** Se presente, o drain só aplica update se o `updated_at` do servidor ainda bater com este valor (guarda otimista — só usado por maintenance_records). */
  guardUpdatedAt?: string;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  status: "pending" | "syncing" | "synced" | "error";
};

export type MetaEntry = { key: string; value: string };

class PmocOfflineDB extends Dexie {
  workOrders!: EntityTable<OfflineWorkOrder, "id">;
  maintenanceRecords!: EntityTable<OfflineMaintenanceRecord, "id">;
  checklistItems!: EntityTable<OfflineChecklistItem, "id">;
  measurements!: EntityTable<OfflineMeasurement, "id">;
  partsRequests!: EntityTable<OfflinePartsRequest, "id">;
  attachments!: EntityTable<OfflineAttachment, "id">;
  attachmentBlobs!: EntityTable<OfflineAttachmentBlob, "id">;
  tickets!: EntityTable<OfflineTicket, "id">;
  equipment!: EntityTable<OfflineEquipment, "id">;
  environments!: EntityTable<OfflineEnvironment, "id">;
  units!: EntityTable<OfflineUnit, "id">;
  sectors!: EntityTable<OfflineSector, "id">;
  partsCatalog!: EntityTable<OfflinePartCatalogItem, "id">;
  checklistTemplates!: EntityTable<OfflineChecklistTemplate, "id">;
  checklistTemplateItems!: EntityTable<OfflineChecklistTemplateItem, "id">;
  measurementTypes!: EntityTable<OfflineMeasurementType, "id">;
  outbox!: EntityTable<OutboxItem, "id">;
  meta!: EntityTable<MetaEntry, "key">;

  constructor() {
    super("pmoc-plus-offline");
    this.version(1).stores({
      workOrders: "id, assignedUserId, status",
      maintenanceRecords: "id, workOrderId, status, technicianUserId",
      checklistItems: "id, maintenanceRecordId",
      measurements: "id, maintenanceRecordId",
      partsRequests: "id, workOrderId, maintenanceRecordId",
      attachments: "id, workOrderId, maintenanceRecordId",
      attachmentBlobs: "id",
      tickets: "id, status, equipmentId",
      equipment: "id, unitId, clientId",
      checklistTemplates: "id",
      checklistTemplateItems: "id, checklistTemplateId, orderIndex",
      measurementTypes: "id",
      outbox: "id, status, createdAt",
      meta: "key",
    });

    // Fase 9 — `environments` entra em cache (dependência NOT NULL de
    // equipment) e `equipment` ganha índice por ambiente. Dexie migra sozinho:
    // tabelas já existentes mantêm os dados, a nova nasce vazia e é populada
    // no primeiro pull. As colunas novas de `equipment` (environmentId, brand,
    // model) não precisam de migração de dados — o pull sobrescreve as linhas
    // por `bulkPut` de qualquer forma.
    // `tag` e `workOrders.unitId` entram como índice porque a Fase 9 consulta
    // por eles (checagem local de tag duplicada e agrupamento por unidade) —
    // Dexie exige índice declarado para `where()`, não filtra campo solto.
    this.version(2).stores({
      workOrders: "id, assignedUserId, status, unitId",
      equipment: "id, unitId, clientId, environmentId, tag",
      environments: "id, unitId, sectorId",
    });

    // Fase 10 — três tabelas de referência novas (units/sectors/partsCatalog) e
    // um índice composto em `measurements`.
    //
    // O composto existe porque a grade da preventiva precisa achar "a medição
    // de temperatura de retorno *deste* equipamento" para atualizar em vez de
    // duplicar. Sem índice declarado, Dexie não consulta por dois campos — e
    // varrer todas as medições do registro para filtrar em memória funcionaria,
    // mas o `where` composto é a forma que o Dexie pede.
    this.version(3).stores({
      measurements: "id, maintenanceRecordId, [maintenanceRecordId+measurementTypeId]",
      units: "id, clientId",
      sectors: "id, unitId",
      partsCatalog: "id, name",
    });
  }
}

export const offlineDb = new PmocOfflineDB();
