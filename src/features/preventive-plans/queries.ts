import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Periodicity } from "@/features/preventive-plans/schema";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type PreventivePlanListItem = {
  id: string;
  periodStart: string;
  periodEnd: string;
  periodicity: Periodicity;
  status: "active" | "inactive";
  clientName: string;
  unitName: string;
  assignedName: string | null;
  equipmentCount: number;
};

export async function listPreventivePlans(): Promise<PreventivePlanListItem[]> {
  const supabase = await createClient();

  const [{ data, error }, { data: linkRows }] = await Promise.all([
    supabase
      .from("preventive_plans")
      .select(
        "id, period_start, period_end, periodicity, status, client:clients(corporate_name), unit:units(name), assigned:users!preventive_plans_assigned_user_id_fkey(full_name)",
      )
      .order("period_start", { ascending: false }),
    supabase.from("preventive_plan_equipment").select("preventive_plan_id"),
  ]);

  if (error) {
    console.error("[listPreventivePlans]", error.message);
    return [];
  }

  const equipmentCount = new Map<string, number>();
  for (const row of linkRows ?? []) {
    equipmentCount.set(row.preventive_plan_id, (equipmentCount.get(row.preventive_plan_id) ?? 0) + 1);
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    periodStart: p.period_start,
    periodEnd: p.period_end,
    periodicity: p.periodicity,
    status: p.status,
    clientName: firstOf(p.client)?.corporate_name ?? "—",
    unitName: firstOf(p.unit)?.name ?? "—",
    assignedName: firstOf(p.assigned)?.full_name ?? null,
    equipmentCount: equipmentCount.get(p.id) ?? 0,
  }));
}

export type PreventivePlanDetail = {
  id: string;
  clientId: string;
  clientName: string;
  unitId: string;
  unitName: string;
  periodStart: string;
  periodEnd: string;
  periodicity: Periodicity;
  status: "active" | "inactive";
  assignedUserId: string | null;
  notes: string | null;
  equipmentIds: string[];
};

export async function getPreventivePlanDetail(
  planId: string,
): Promise<PreventivePlanDetail | null> {
  const supabase = await createClient();

  const [{ data, error }, { data: links }] = await Promise.all([
    supabase
      .from("preventive_plans")
      .select(
        "id, client_id, client:clients(corporate_name), unit_id, unit:units(name), period_start, period_end, periodicity, status, assigned_user_id, notes",
      )
      .eq("id", planId)
      .maybeSingle(),
    supabase.from("preventive_plan_equipment").select("equipment_id").eq("preventive_plan_id", planId),
  ]);

  if (error || !data) {
    if (error) console.error("[getPreventivePlanDetail]", error.message);
    return null;
  }

  return {
    id: data.id,
    clientId: data.client_id,
    clientName: firstOf(data.client)?.corporate_name ?? "—",
    unitId: data.unit_id,
    unitName: firstOf(data.unit)?.name ?? "—",
    periodStart: data.period_start,
    periodEnd: data.period_end,
    periodicity: data.periodicity,
    status: data.status,
    assignedUserId: data.assigned_user_id,
    notes: data.notes,
    equipmentIds: (links ?? []).map((l) => l.equipment_id),
  };
}

/** Contagem de planos ativos — card "Preventivas pendentes" do dashboard. */
export async function countActivePreventivePlans(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("preventive_plans")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (error) {
    console.error("[countActivePreventivePlans]", error.message);
    return 0;
  }

  return count ?? 0;
}
