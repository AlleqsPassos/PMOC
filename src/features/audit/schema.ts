/**
 * Catálogo de `entity_type` que aparecem em audit_logs — um por tabela com
 * trigger de auditoria (ver migrations 0012/0015/0022/0030/0033/0036), mais
 * `user_permissions`, que não tem trigger (PK composta, sem `id` — captura é
 * manual em src/features/permissions/actions.ts, ver comentário lá).
 * Usado no filtro da tela de auditoria e para rotular a coluna "Entidade".
 */
export const AUDIT_ENTITY_TYPES = [
  "companies",
  "users",
  "invites",
  "user_permissions",
  "clients",
  "units",
  "sectors",
  "environments",
  "equipment",
  "tickets",
  "work_orders",
  "preventive_plans",
  "maintenance_records",
  "checklist_templates",
  "parts_requests",
  "pmocs",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  companies: "Empresa",
  users: "Usuário",
  invites: "Convite",
  user_permissions: "Permissão de usuário",
  clients: "Cliente",
  units: "Unidade",
  sectors: "Setor",
  environments: "Ambiente",
  equipment: "Equipamento",
  tickets: "Chamado",
  work_orders: "Ordem de serviço",
  preventive_plans: "Plano preventivo",
  maintenance_records: "Registro de manutenção",
  checklist_templates: "Template de checklist",
  parts_requests: "Solicitação de peça",
  pmocs: "PMOC",
};

/** Ações vindas do trigger genérico (lower(TG_OP)) + as customizadas de permissões (camada de aplicação). */
export const ACTION_LABELS: Record<string, string> = {
  insert: "Criado",
  update: "Atualizado",
  delete: "Excluído",
  grant_permission: "Permissão concedida",
  revoke_permission: "Permissão revogada",
  reset_permission: "Permissão redefinida (padrão do papel)",
};

export function isAuditEntityType(value: string): value is AuditEntityType {
  return (AUDIT_ENTITY_TYPES as readonly string[]).includes(value);
}
