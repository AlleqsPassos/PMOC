import "server-only";
import { createClient } from "@/lib/supabase/server";

async function countByKey(
  table: "sectors" | "environments" | "equipment",
  key: "unit_id",
) {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select(key).is("deleted_at", null);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, string>[]) {
    const value = row[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export type UnitListItem = {
  id: string;
  name: string;
  status: "active" | "inactive";
  clientId: string;
  clientName: string;
  sectorsCount: number;
  environmentsCount: number;
  equipmentCount: number;
};

/** Lista global de unidades (todas as empresas do tenant), com nome do cliente. */
export async function listUnits(): Promise<UnitListItem[]> {
  const supabase = await createClient();

  const [{ data, error }, sectorsCount, environmentsCount, equipmentCount] =
    await Promise.all([
      supabase
        .from("units")
        .select("id, name, status, client_id, client:clients(corporate_name)")
        .is("deleted_at", null)
        .order("name"),
      countByKey("sectors", "unit_id"),
      countByKey("environments", "unit_id"),
      countByKey("equipment", "unit_id"),
    ]);

  if (error) {
    console.error("[listUnits]", error.message);
    return [];
  }

  return (data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    status: u.status,
    clientId: u.client_id,
    clientName: Array.isArray(u.client)
      ? (u.client[0]?.corporate_name ?? "—")
      : (u.client?.corporate_name ?? "—"),
    sectorsCount: sectorsCount.get(u.id) ?? 0,
    environmentsCount: environmentsCount.get(u.id) ?? 0,
    equipmentCount: equipmentCount.get(u.id) ?? 0,
  }));
}

export type ClientUnitItem = {
  id: string;
  name: string;
  status: "active" | "inactive";
  environmentsCount: number;
  equipmentCount: number;
};

/** Unidades de um cliente específico — usado na página de detalhe do cliente. */
export async function listUnitsForClient(
  clientId: string,
): Promise<ClientUnitItem[]> {
  const supabase = await createClient();

  const [{ data, error }, environmentsCount, equipmentCount] =
    await Promise.all([
      supabase
        .from("units")
        .select("id, name, status")
        .eq("client_id", clientId)
        .is("deleted_at", null)
        .order("name"),
      countByKey("environments", "unit_id"),
      countByKey("equipment", "unit_id"),
    ]);

  if (error) {
    console.error("[listUnitsForClient]", error.message);
    return [];
  }

  return (data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    status: u.status,
    environmentsCount: environmentsCount.get(u.id) ?? 0,
    equipmentCount: equipmentCount.get(u.id) ?? 0,
  }));
}

export type UnitDetail = {
  id: string;
  name: string;
  responsibleName: string | null;
  phone: string | null;
  notes: string | null;
  status: "active" | "inactive";
  clientId: string;
  clientName: string;
};

export async function getUnitDetail(unitId: string): Promise<UnitDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select(
      "id, name, responsible_name, phone, notes, status, client_id, client:clients(corporate_name)",
    )
    .eq("id", unitId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getUnitDetail]", error.message);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    responsibleName: data.responsible_name,
    phone: data.phone,
    notes: data.notes,
    status: data.status,
    clientId: data.client_id,
    clientName: Array.isArray(data.client)
      ? (data.client[0]?.corporate_name ?? "—")
      : (data.client?.corporate_name ?? "—"),
  };
}

export type SectorItem = { id: string; name: string; notes: string | null };

export async function listSectorsForUnit(unitId: string): Promise<SectorItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sectors")
    .select("id, name, notes")
    .eq("unit_id", unitId)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("[listSectorsForUnit]", error.message);
    return [];
  }

  return data ?? [];
}

export type EnvironmentItem = {
  id: string;
  name: string;
  notes: string | null;
  sectorId: string | null;
  sectorName: string | null;
};

export async function listEnvironmentsForUnit(
  unitId: string,
): Promise<EnvironmentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("environments")
    .select("id, name, notes, sector_id, sector:sectors(name)")
    .eq("unit_id", unitId)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("[listEnvironmentsForUnit]", error.message);
    return [];
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    notes: e.notes,
    sectorId: e.sector_id,
    sectorName: Array.isArray(e.sector)
      ? (e.sector[0]?.name ?? null)
      : (e.sector?.name ?? null),
  }));
}

// Opções para selects (formulário de unidade / cascata de equipamento) --------

export type UnitOption = { id: string; name: string; clientId: string };

export async function listUnitOptions(): Promise<UnitOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, name, client_id")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("[listUnitOptions]", error.message);
    return [];
  }

  return (data ?? []).map((u) => ({ id: u.id, name: u.name, clientId: u.client_id }));
}

export type SectorOption = { id: string; name: string; unitId: string };

export async function listSectorOptions(): Promise<SectorOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sectors")
    .select("id, name, unit_id")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("[listSectorOptions]", error.message);
    return [];
  }

  return (data ?? []).map((s) => ({ id: s.id, name: s.name, unitId: s.unit_id }));
}

export type EnvironmentOption = {
  id: string;
  name: string;
  unitId: string;
  sectorId: string | null;
};

export async function listEnvironmentOptions(): Promise<EnvironmentOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("environments")
    .select("id, name, unit_id, sector_id")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("[listEnvironmentOptions]", error.message);
    return [];
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    unitId: e.unit_id,
    sectorId: e.sector_id,
  }));
}
