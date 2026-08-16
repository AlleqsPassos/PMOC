import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMaintenanceRecordDetail, type MaintenanceRecordDetail } from "@/features/maintenance/queries";
import type { WorkOrderType } from "@/features/work-orders/schema";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type PmocStatus = "draft" | "generated";

export type PmocListItem = {
  id: string;
  title: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  status: PmocStatus;
  generatedAt: string | null;
};

export async function listPmocs(): Promise<PmocListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pmocs")
    .select(
      "id, title, period_start, period_end, status, generated_at, client:clients(corporate_name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listPmocs]", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    clientName: firstOf(p.client)?.corporate_name ?? "—",
    periodStart: p.period_start,
    periodEnd: p.period_end,
    status: p.status,
    generatedAt: p.generated_at,
  }));
}

/** Card "Situação do PMOC" do dashboard — só PMOCs efetivamente gerados. */
export async function countGeneratedPmocs(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("pmocs")
    .select("id", { count: "exact", head: true })
    .eq("status", "generated");

  if (error) {
    console.error("[countGeneratedPmocs]", error.message);
    return 0;
  }
  return count ?? 0;
}

export type PmocDetail = {
  id: string;
  title: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  status: PmocStatus;
  pdfStoragePath: string | null;
  generatedAt: string | null;
  generatedByName: string | null;
  workOrders: { id: string; title: string; type: WorkOrderType; unitName: string }[];
};

export async function getPmocDetail(pmocId: string): Promise<PmocDetail | null> {
  const supabase = await createClient();

  const [{ data, error }, { data: links }] = await Promise.all([
    supabase
      .from("pmocs")
      .select(
        `id, title, period_start, period_end, status, pdf_storage_path, generated_at,
         client:clients(corporate_name), generated_by_user:users(full_name)`,
      )
      .eq("id", pmocId)
      .maybeSingle(),
    supabase
      .from("pmoc_work_orders")
      .select("work_order:work_orders(id, title, type, unit:units(name))")
      .eq("pmoc_id", pmocId),
  ]);

  if (error || !data) {
    if (error) console.error("[getPmocDetail]", error.message);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    clientName: firstOf(data.client)?.corporate_name ?? "—",
    periodStart: data.period_start,
    periodEnd: data.period_end,
    status: data.status,
    pdfStoragePath: data.pdf_storage_path,
    generatedAt: data.generated_at,
    generatedByName: firstOf(data.generated_by_user)?.full_name ?? null,
    workOrders: (links ?? []).flatMap((l) => {
      const wo = firstOf(l.work_order);
      if (!wo) return [];
      const unit = firstOf(wo.unit);
      return [{ id: wo.id, title: wo.title, type: wo.type, unitName: unit?.name ?? "—" }];
    }),
  };
}

export type PmocEligibleWorkOrder = {
  id: string;
  title: string;
  type: WorkOrderType;
  unitName: string;
  scheduledDate: string | null;
  finishedAt: string | null;
};

function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/**
 * OS concluídas do cliente com finished_at dentro de [periodStart, periodEnd].
 * Limite superior exclusivo (dia seguinte) em vez de `.lte(periodEnd)` — evita
 * truncar a última data por causa da hora do finished_at (timestamptz),
 * mesma cautela de fuso já aprendida na Fase 4 (ver src/lib/format-date.ts).
 */
export async function findEligibleWorkOrders(
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<PmocEligibleWorkOrder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_orders")
    .select("id, title, type, scheduled_date, finished_at, unit:units(name)")
    .eq("client_id", clientId)
    .eq("status", "concluida")
    .not("finished_at", "is", null)
    .gte("finished_at", periodStart)
    .lt("finished_at", addOneDay(periodEnd))
    .order("finished_at");

  if (error) {
    console.error("[findEligibleWorkOrders]", error.message);
    return [];
  }

  return (data ?? []).map((wo) => ({
    id: wo.id,
    title: wo.title,
    type: wo.type,
    unitName: firstOf(wo.unit)?.name ?? "—",
    scheduledDate: wo.scheduled_date,
    finishedAt: wo.finished_at,
  }));
}

export type PmocWorkOrderGroup = PmocEligibleWorkOrder & {
  equipmentRecords: MaintenanceRecordDetail[];
};

export type PmocConsolidationData = {
  company: { corporateName: string; cnpj: string | null };
  client: { corporateName: string; cnpj: string | null };
  title: string;
  periodStart: string;
  periodEnd: string;
  workOrderGroups: PmocWorkOrderGroup[];
};

/**
 * Monta os dados completos pra render do PDF — reaproveita
 * getMaintenanceRecordDetail (já existente, Fase 4) por equipamento em vez
 * de duplicar a query de checklist/medições/laudo.
 */
export async function getPmocConsolidationData(params: {
  clientId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  workOrders: PmocEligibleWorkOrder[];
}): Promise<PmocConsolidationData> {
  const supabase = await createClient();

  const [{ data: company }, { data: client }] = await Promise.all([
    supabase.from("companies").select("corporate_name, cnpj").single(),
    supabase
      .from("clients")
      .select("corporate_name, cnpj")
      .eq("id", params.clientId)
      .maybeSingle(),
  ]);

  const workOrderGroups = await Promise.all(
    params.workOrders.map(async (wo) => {
      const { data: records } = await supabase
        .from("maintenance_records")
        .select("id")
        .eq("work_order_id", wo.id)
        .eq("status", "completed");

      const details = await Promise.all(
        (records ?? []).map((r) => getMaintenanceRecordDetail(r.id)),
      );

      return {
        ...wo,
        equipmentRecords: details.filter((d): d is MaintenanceRecordDetail => d !== null),
      };
    }),
  );

  return {
    company: { corporateName: company?.corporate_name ?? "—", cnpj: company?.cnpj ?? null },
    client: { corporateName: client?.corporate_name ?? "—", cnpj: client?.cnpj ?? null },
    title: params.title,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    workOrderGroups,
  };
}
