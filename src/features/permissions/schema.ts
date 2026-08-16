/** Rótulo PT-BR por `category` do catálogo de permissions (ver seeds em 0005/0020/0028). */
export const CATEGORY_LABELS: Record<string, string> = {
  clients: "Clientes",
  units: "Unidades",
  environments: "Ambientes/Setores",
  equipment: "Equipamentos",
  tickets: "Chamados",
  work_orders: "Ordens de serviço",
  preventive_plans: "Preventivas",
  checklists: "Templates de checklist",
  measurements: "Tipos de medição",
  parts: "Solicitações de peças",
  pmoc: "PMOC",
  users: "Usuários e permissões",
  audit: "Auditoria",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** Estado de um override na UI — "default" = sem linha em user_permissions (usa o papel). */
export const OVERRIDE_MODES = ["default", "allow", "deny"] as const;
export type OverrideMode = (typeof OVERRIDE_MODES)[number];

export const OVERRIDE_MODE_LABELS: Record<OverrideMode, string> = {
  default: "Padrão do papel",
  allow: "Permitir",
  deny: "Negar",
};
