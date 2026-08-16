import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ClientListItem = {
  id: string;
  corporateName: string;
  tradeName: string | null;
  cnpj: string | null;
  status: "active" | "inactive";
  unitsCount: number;
};

/**
 * Contagem de unidades por cliente calculada com uma query separada
 * (filtrando deleted_at) em vez de `units(count)` embutido — evita depender
 * de sintaxe de filtro em relação embutida do PostgREST para algo simples.
 */
export async function listClients(): Promise<ClientListItem[]> {
  const supabase = await createClient();

  const [{ data: clients, error: clientsError }, { data: unitRows }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, corporate_name, trade_name, cnpj, status")
        .order("corporate_name"),
      supabase.from("units").select("client_id").is("deleted_at", null),
    ]);

  if (clientsError) {
    console.error("[listClients]", clientsError.message);
    return [];
  }

  const unitsCount = new Map<string, number>();
  for (const row of unitRows ?? []) {
    unitsCount.set(row.client_id, (unitsCount.get(row.client_id) ?? 0) + 1);
  }

  return (clients ?? []).map((c) => ({
    id: c.id,
    corporateName: c.corporate_name,
    tradeName: c.trade_name,
    cnpj: c.cnpj,
    status: c.status,
    unitsCount: unitsCount.get(c.id) ?? 0,
  }));
}

export type ClientOption = { id: string; corporateName: string };

/** Lista enxuta para popular selects (formulário de unidade). */
export async function listClientOptions(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, corporate_name")
    .eq("status", "active")
    .order("corporate_name");

  if (error) {
    console.error("[listClientOptions]", error.message);
    return [];
  }

  return (data ?? []).map((c) => ({ id: c.id, corporateName: c.corporate_name }));
}

export type ClientDetail = {
  id: string;
  corporateName: string;
  tradeName: string | null;
  cnpj: string | null;
  address: Record<string, unknown> | null;
  phone: string | null;
  email: string | null;
  responsibleName: string | null;
  notes: string | null;
  status: "active" | "inactive";
};

export async function getClientById(
  clientId: string,
): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, corporate_name, trade_name, cnpj, address, phone, email, responsible_name, notes, status",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getClientById]", error.message);
    return null;
  }

  return {
    id: data.id,
    corporateName: data.corporate_name,
    tradeName: data.trade_name,
    cnpj: data.cnpj,
    address: data.address,
    phone: data.phone,
    email: data.email,
    responsibleName: data.responsible_name,
    notes: data.notes,
    status: data.status,
  };
}
