"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  environmentSchema,
  sectorSchema,
  unitSchema,
} from "@/features/units/schema";

export type UnitFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

// units -----------------------------------------------------------------

function parseUnitForm(formData: FormData) {
  return unitSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    responsibleName: formData.get("responsibleName") || undefined,
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

/** Cria uma unidade. Requer create_units. */
export async function createUnit(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const user = await requireUser();
  await assertPermission("create_units");

  const parsed = parseUnitForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("units").insert({
    company_id: user.companyId,
    client_id: parsed.data.clientId,
    name: parsed.data.name,
    responsible_name: parsed.data.responsibleName || null,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: `Não foi possível criar a unidade: ${error.message}` };
  }

  revalidatePath("/unidades");
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return { success: true };
}

/** Edita uma unidade existente. Requer edit_units. */
export async function updateUnit(
  unitId: string,
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireUser();
  await assertPermission("edit_units");

  const parsed = parseUnitForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("units")
    .update({
      client_id: parsed.data.clientId,
      name: parsed.data.name,
      responsible_name: parsed.data.responsibleName || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", unitId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${unitId}`);
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return { success: true };
}

/** Ativa/inativa uma unidade. Requer edit_units. */
export async function setUnitStatus(
  unitId: string,
  status: "active" | "inactive",
): Promise<void> {
  await requireUser();
  await assertPermission("edit_units");

  const supabase = await createSupabaseClient();
  await supabase.from("units").update({ status }).eq("id", unitId);

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${unitId}`);
}

// sectors -----------------------------------------------------------------

function parseSectorForm(formData: FormData) {
  return sectorSchema.safeParse({
    unitId: formData.get("unitId"),
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
  });
}

/** Cria um setor dentro de uma unidade. Requer create_environments. */
export async function createSector(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const user = await requireUser();
  await assertPermission("create_environments");

  const parsed = parseSectorForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("sectors").insert({
    company_id: user.companyId,
    unit_id: parsed.data.unitId,
    name: parsed.data.name,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: `Não foi possível criar o setor: ${error.message}` };
  }

  revalidatePath(`/unidades/${parsed.data.unitId}`);
  return { success: true };
}

/** Edita um setor. Requer edit_environments. */
export async function updateSector(
  sectorId: string,
  unitId: string,
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireUser();
  await assertPermission("edit_environments");

  const parsed = parseSectorForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("sectors")
    .update({ name: parsed.data.name, notes: parsed.data.notes || null })
    .eq("id", sectorId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath(`/unidades/${unitId}`);
  return { success: true };
}

/** Remove (soft delete) um setor. Requer edit_environments. */
export async function removeSector(
  sectorId: string,
  unitId: string,
): Promise<void> {
  const user = await requireUser();
  await assertPermission("edit_environments");

  const supabase = await createSupabaseClient();
  await supabase
    .from("sectors")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", sectorId);

  // Soft delete não é um delete real — nada dispara ON DELETE SET NULL nas
  // FKs. Como sector_id é opcional em environments/equipment, desvincula
  // manualmente para não deixar referências "penduradas" num setor removido.
  await supabase
    .from("environments")
    .update({ sector_id: null })
    .eq("sector_id", sectorId);
  await supabase.from("equipment").update({ sector_id: null }).eq("sector_id", sectorId);

  revalidatePath(`/unidades/${unitId}`);
}

// environments --------------------------------------------------------------

function parseEnvironmentForm(formData: FormData) {
  const sectorId = formData.get("sectorId");
  return environmentSchema.safeParse({
    unitId: formData.get("unitId"),
    // "none" é o sentinel do Select (Radix não aceita value="") — trata
    // como "sem setor", igual a campo ausente.
    sectorId: sectorId && sectorId !== "none" ? sectorId : undefined,
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
  });
}

/** Cria um ambiente dentro de uma unidade. Requer create_environments. */
export async function createEnvironment(
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const user = await requireUser();
  await assertPermission("create_environments");

  const parsed = parseEnvironmentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("environments").insert({
    company_id: user.companyId,
    unit_id: parsed.data.unitId,
    sector_id: parsed.data.sectorId || null,
    name: parsed.data.name,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: `Não foi possível criar o ambiente: ${error.message}` };
  }

  revalidatePath(`/unidades/${parsed.data.unitId}`);
  return { success: true };
}

/** Edita um ambiente. Requer edit_environments. */
export async function updateEnvironment(
  environmentId: string,
  unitId: string,
  _prevState: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  await requireUser();
  await assertPermission("edit_environments");

  const parsed = parseEnvironmentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("environments")
    .update({
      sector_id: parsed.data.sectorId || null,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
    })
    .eq("id", environmentId);

  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath(`/unidades/${unitId}`);
  return { success: true };
}

/**
 * Remove (soft delete) um ambiente. Requer edit_environments.
 *
 * Diferente de sector_id, environment_id é NOT NULL em equipment — não dá
 * para "desvincular" um equipamento de ambiente ao remover o ambiente (não
 * haveria valor válido para colocar no lugar). Por isso bloqueia a remoção
 * enquanto existir equipamento (não deletado) apontando para cá.
 */
export async function removeEnvironment(
  environmentId: string,
  unitId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  await assertPermission("edit_environments");

  const supabase = await createSupabaseClient();

  const { count } = await supabase
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .eq("environment_id", environmentId)
    .is("deleted_at", null);

  if (count && count > 0) {
    return {
      error: `Não é possível remover: ${count} equipamento(s) ainda cadastrado(s) neste ambiente.`,
    };
  }

  await supabase
    .from("environments")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", environmentId);

  revalidatePath(`/unidades/${unitId}`);
  return {};
}
