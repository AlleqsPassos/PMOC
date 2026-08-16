import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceType } from "@/features/checklist-templates/schema";

function countByKey(rows: { checklist_template_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.checklist_template_id, (counts.get(row.checklist_template_id) ?? 0) + 1);
  }
  return counts;
}

export type ChecklistTemplateListItem = {
  id: string;
  name: string;
  maintenanceType: MaintenanceType;
  equipmentType: string | null;
  itemsCount: number;
};

export async function listChecklistTemplates(): Promise<ChecklistTemplateListItem[]> {
  const supabase = await createClient();

  const [{ data, error }, { data: itemRows }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, maintenance_type, equipment_type")
      .order("name"),
    supabase.from("checklist_template_items").select("checklist_template_id"),
  ]);

  if (error) {
    console.error("[listChecklistTemplates]", error.message);
    return [];
  }

  const counts = countByKey(itemRows ?? []);

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    maintenanceType: t.maintenance_type,
    equipmentType: t.equipment_type,
    itemsCount: counts.get(t.id) ?? 0,
  }));
}

/** Templates aplicáveis ao contexto de uma execução — filtra por tipo de manutenção. */
export async function listApplicableChecklistTemplates(
  maintenanceType: "preventiva" | "corretiva",
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("id, name")
    .in("maintenance_type", [maintenanceType, "ambos"])
    .order("name");

  if (error) {
    console.error("[listApplicableChecklistTemplates]", error.message);
    return [];
  }

  return data ?? [];
}

export type ChecklistTemplateItem = {
  id: string;
  label: string;
  orderIndex: number;
  isRequired: boolean;
  allowsOther: boolean;
};

export type ChecklistTemplateDetail = {
  id: string;
  name: string;
  maintenanceType: MaintenanceType;
  equipmentType: string | null;
  items: ChecklistTemplateItem[];
};

export async function getChecklistTemplateDetail(
  templateId: string,
): Promise<ChecklistTemplateDetail | null> {
  const supabase = await createClient();

  const [{ data, error }, { data: items }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, maintenance_type, equipment_type")
      .eq("id", templateId)
      .maybeSingle(),
    supabase
      .from("checklist_template_items")
      .select("id, label, order_index, is_required, allows_other")
      .eq("checklist_template_id", templateId)
      .order("order_index"),
  ]);

  if (error || !data) {
    if (error) console.error("[getChecklistTemplateDetail]", error.message);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    maintenanceType: data.maintenance_type,
    equipmentType: data.equipment_type,
    items: (items ?? []).map((i) => ({
      id: i.id,
      label: i.label,
      orderIndex: i.order_index,
      isRequired: i.is_required,
      allowsOther: i.allows_other,
    })),
  };
}

/** Itens de um template — usado ao aplicar o checklist num maintenance_record. */
export async function listTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
  const detail = await getChecklistTemplateDetail(templateId);
  return detail?.items ?? [];
}
