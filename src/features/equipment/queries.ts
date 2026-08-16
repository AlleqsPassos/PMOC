import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EquipmentStatus } from "@/features/equipment/schema";

export type EquipmentListItem = {
  id: string;
  tag: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  status: EquipmentStatus;
  unitId: string;
  unitName: string;
  clientName: string;
  environmentName: string;
};

type EquipmentFilters = {
  clientId?: string;
  unitId?: string;
  status?: EquipmentStatus;
};

/**
 * Lista equipamentos com o nome de unidade/cliente/ambiente já resolvidos.
 * Filtro por cliente é feito em duas etapas (unidades do cliente -> equipment
 * dessas unidades) porque equipment não guarda client_id diretamente — só
 * unit_id (ver seção 3/4 da arquitetura, client_id é redundante aqui).
 */
export async function listEquipment(
  filters: EquipmentFilters = {},
): Promise<EquipmentListItem[]> {
  const supabase = await createClient();

  let unitIdsForClient: string[] | null = null;
  if (filters.clientId) {
    const { data: units } = await supabase
      .from("units")
      .select("id")
      .eq("client_id", filters.clientId);
    unitIdsForClient = (units ?? []).map((u) => u.id);
    if (unitIdsForClient.length === 0) return [];
  }

  let query = supabase
    .from("equipment")
    .select(
      "id, tag, type, brand, model, status, unit_id, unit:units(name, client:clients(corporate_name)), environment:environments(name)",
    )
    .is("deleted_at", null)
    .order("tag");

  if (filters.unitId) query = query.eq("unit_id", filters.unitId);
  if (filters.status) query = query.eq("status", filters.status);
  if (unitIdsForClient) query = query.in("unit_id", unitIdsForClient);

  const { data, error } = await query;

  if (error) {
    console.error("[listEquipment]", error.message);
    return [];
  }

  return (data ?? []).map((e) => {
    const unit = Array.isArray(e.unit) ? e.unit[0] : e.unit;
    const client = unit ? (Array.isArray(unit.client) ? unit.client[0] : unit.client) : null;
    const environment = Array.isArray(e.environment) ? e.environment[0] : e.environment;

    return {
      id: e.id,
      tag: e.tag,
      type: e.type,
      brand: e.brand,
      model: e.model,
      status: e.status,
      unitId: e.unit_id,
      unitName: unit?.name ?? "—",
      clientName: client?.corporate_name ?? "—",
      environmentName: environment?.name ?? "—",
    };
  });
}

export async function listEquipmentByUnit(
  unitId: string,
): Promise<EquipmentListItem[]> {
  return listEquipment({ unitId });
}

export type EquipmentDetail = {
  id: string;
  tag: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  capacityBtu: number | null;
  refrigerant: string | null;
  voltage: string | null;
  notes: string | null;
  status: EquipmentStatus;
  unitId: string;
  unitName: string;
  clientId: string;
  clientName: string;
  sectorId: string | null;
  environmentId: string;
  environmentName: string;
};

export async function getEquipmentById(
  equipmentId: string,
): Promise<EquipmentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select(
      "id, tag, type, brand, model, serial_number, capacity_btu, refrigerant, voltage, notes, status, unit_id, sector_id, environment_id, unit:units(name, client_id, client:clients(corporate_name)), environment:environments(name)",
    )
    .eq("id", equipmentId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getEquipmentById]", error.message);
    return null;
  }

  const unit = Array.isArray(data.unit) ? data.unit[0] : data.unit;
  const client = unit ? (Array.isArray(unit.client) ? unit.client[0] : unit.client) : null;
  const environment = Array.isArray(data.environment) ? data.environment[0] : data.environment;

  return {
    id: data.id,
    tag: data.tag,
    type: data.type,
    brand: data.brand,
    model: data.model,
    serialNumber: data.serial_number,
    capacityBtu: data.capacity_btu,
    refrigerant: data.refrigerant,
    voltage: data.voltage,
    notes: data.notes,
    status: data.status,
    unitId: data.unit_id,
    unitName: unit?.name ?? "—",
    clientId: unit?.client_id ?? "",
    clientName: client?.corporate_name ?? "—",
    sectorId: data.sector_id,
    environmentId: data.environment_id,
    environmentName: environment?.name ?? "—",
  };
}

export type EquipmentOption = { id: string; tag: string; unitId: string };

/** Lista enxuta para selects em cascata (ex: formulário de chamado). */
export async function listEquipmentOptions(): Promise<EquipmentOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("id, tag, unit_id")
    .is("deleted_at", null)
    .order("tag");

  if (error) {
    console.error("[listEquipmentOptions]", error.message);
    return [];
  }

  return (data ?? []).map((e) => ({ id: e.id, tag: e.tag, unitId: e.unit_id }));
}

/** Contagem total (não-deletados) — usada no card do dashboard. */
export async function countEquipment(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (error) {
    console.error("[countEquipment]", error.message);
    return 0;
  }

  return count ?? 0;
}
