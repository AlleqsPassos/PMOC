import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PartCatalogItem = {
  id: string;
  name: string;
  unit: string | null;
  isActive: boolean;
  /** Linha do seed, comum a todas as empresas — não editável por tenant nenhum. */
  isGlobal: boolean;
};

/**
 * Catálogo visível para a empresa: as peças globais do seed mais as que ela
 * mesma cadastrou (a RLS de `parts_catalog` já entrega exatamente isso).
 * Inclui inativas — a tela do admin precisa mostrar o que foi desativado para
 * poder reativar.
 */
export async function listPartsCatalog(): Promise<PartCatalogItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts_catalog")
    .select("id, company_id, name, unit, is_active")
    .order("name");

  if (error) {
    console.error("[listPartsCatalog]", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    isActive: p.is_active,
    isGlobal: p.company_id === null,
  }));
}
