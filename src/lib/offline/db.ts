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
 * Tabelas de referência (workOrders, equipment, checklistTemplates*,
 * measurementTypes) são só-leitura do ponto de vista da UI — populadas
 * inteiramente por `pull-sync.ts`, nunca editadas localmente.
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

/** Cache só-leitura — dataset pequeno (empresa única), pra cascata de criação de chamado ad-hoc offline. */
export type OfflineEquipment = {
  id: string;
  tag: string;
  type: string | null;
  unitId: string;
  unitName: string;
  clientId: string;
  clientName: string;
};

export type OfflineChecklistTemplate = {
  id: string;
  name: string;
  maintenanceType: "preventiva" | "corretiva" | "ambos";
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
  | "maintenance_records"
  | "maintenance_record_checklist_items"
  | "measurements"
  | "parts_requests"
  | "attachments"
  | "tickets";

/**
 * Um item por mutação offline, na ordem em que foi criada. `payload` já
 * vem em snake_case (formato que o Supabase espera), montado no momento do
 * `enqueue()` — o drain não faz transformação, só envia.
 */
export type OutboxItem = {
  id: string;
  entityTable: OutboxTable;
  entityId: string;
  operation: "insert" | "update";
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
  }
}

export const offlineDb = new PmocOfflineDB();
