import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAuditEntityType, type AuditEntityType } from "@/features/audit/schema";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string | null;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
};

const SELECT = "id, action, entity_type, entity_id, previous_data, new_data, created_at, user:users(full_name)";

function mapRow(row: {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user: { full_name: string } | { full_name: string }[] | null;
}): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    userName: firstOf(row.user)?.full_name ?? null,
    previousData: row.previous_data,
    newData: row.new_data,
    createdAt: row.created_at,
  };
}

const PAGE_SIZE = 30;

type AuditLogFilters = {
  entityType?: AuditEntityType;
  dateFrom?: string;
  /** Exclusivo — passar o dia seguinte ao último dia desejado (mesma cautela de fuso já documentada na Fase 4/5). */
  dateToExclusive?: string;
  page?: number;
};

/**
 * Listagem paginada de audit_logs — RLS (company_id = auth_company_id() AND
 * has_permission(view_audit_log)) já é a fronteira de autorização real; esta
 * query não reforça permissão em código, mesmo padrão das demais queries.ts
 * do projeto (a página que chama é quem faz o gate de UX com hasPermission()).
 */
export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<{ entries: AuditLogEntry[]; total: number; pageSize: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_logs")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.entityType && isAuditEntityType(filters.entityType)) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateToExclusive) query = query.lt("created_at", filters.dateToExclusive);

  const { data, error, count } = await query;

  if (error) {
    console.error("[listAuditLogs]", error.message);
    return { entries: [], total: 0, pageSize: PAGE_SIZE };
  }

  return { entries: (data ?? []).map(mapRow), total: count ?? 0, pageSize: PAGE_SIZE };
}

/** Últimos N eventos, sem filtro/paginação — card "Atividade recente" do dashboard. */
export async function listRecentAuditActivity(limit = 5): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentAuditActivity]", error.message);
    return [];
  }

  return (data ?? []).map(mapRow);
}
