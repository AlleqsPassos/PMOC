"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { equipmentSchema, type EquipmentStatus } from "@/features/equipment/schema";

export type EquipmentFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function parseEquipmentForm(formData: FormData) {
  const sectorId = formData.get("sectorId");
  return equipmentSchema.safeParse({
    unitId: formData.get("unitId"),
    sectorId: sectorId && sectorId !== "none" ? sectorId : undefined,
    environmentId: formData.get("environmentId"),
    tag: formData.get("tag"),
    type: formData.get("type") || undefined,
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
    serialNumber: formData.get("serialNumber") || undefined,
    capacityBtu: formData.get("capacityBtu") || undefined,
    refrigerant: formData.get("refrigerant") || undefined,
    voltage: formData.get("voltage") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

function duplicateTagMessage(tag: string) {
  return `Já existe um equipamento com a tag "${tag}" nesta empresa — a tag precisa ser única.`;
}

/** Cria um equipamento. Requer create_equipment. */
export async function createEquipment(
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  const user = await requireUser();
  await assertPermission("create_equipment");

  const parsed = parseEquipmentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("equipment").insert({
    company_id: user.companyId,
    unit_id: parsed.data.unitId,
    sector_id: parsed.data.sectorId || null,
    environment_id: parsed.data.environmentId,
    tag: parsed.data.tag,
    type: parsed.data.type || null,
    brand: parsed.data.brand || null,
    model: parsed.data.model || null,
    serial_number: parsed.data.serialNumber || null,
    capacity_btu: parsed.data.capacityBtu ? Number(parsed.data.capacityBtu) : null,
    refrigerant: parsed.data.refrigerant || null,
    voltage: parsed.data.voltage || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { tag: [duplicateTagMessage(parsed.data.tag)] } };
    }
    return { error: `Não foi possível criar o equipamento: ${error.message}` };
  }

  revalidatePath("/equipamentos");
  revalidatePath(`/unidades/${parsed.data.unitId}`);
  return { success: true };
}

/** Edita um equipamento existente. Requer edit_equipment. */
export async function updateEquipment(
  equipmentId: string,
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  await requireUser();
  await assertPermission("edit_equipment");

  const parsed = parseEquipmentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("equipment")
    .update({
      unit_id: parsed.data.unitId,
      sector_id: parsed.data.sectorId || null,
      environment_id: parsed.data.environmentId,
      tag: parsed.data.tag,
      type: parsed.data.type || null,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      serial_number: parsed.data.serialNumber || null,
      capacity_btu: parsed.data.capacityBtu ? Number(parsed.data.capacityBtu) : null,
      refrigerant: parsed.data.refrigerant || null,
      voltage: parsed.data.voltage || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", equipmentId);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { tag: [duplicateTagMessage(parsed.data.tag)] } };
    }
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/equipamentos");
  revalidatePath(`/equipamentos/${equipmentId}`);
  revalidatePath(`/unidades/${parsed.data.unitId}`);
  return { success: true };
}

/** Troca o status operacional do equipamento. Requer edit_equipment. */
export async function setEquipmentStatus(
  equipmentId: string,
  status: EquipmentStatus,
): Promise<void> {
  await requireUser();
  await assertPermission("edit_equipment");

  const supabase = await createSupabaseClient();
  await supabase.from("equipment").update({ status }).eq("id", equipmentId);

  revalidatePath("/equipamentos");
  revalidatePath(`/equipamentos/${equipmentId}`);
}
