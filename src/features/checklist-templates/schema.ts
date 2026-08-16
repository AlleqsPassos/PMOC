import { z } from "zod";

export const MAINTENANCE_TYPE = ["preventiva", "corretiva", "ambos"] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPE)[number];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  ambos: "Ambos",
};

export const checklistTemplateSchema = z.object({
  name: z.string().min(2, { error: "Informe um nome para o template." }),
  maintenanceType: z.enum(MAINTENANCE_TYPE),
  equipmentType: z.string().optional(),
});

export type ChecklistTemplateInput = z.infer<typeof checklistTemplateSchema>;

export const checklistTemplateItemSchema = z.object({
  label: z.string().min(1, { error: "Informe o texto do item." }),
  isRequired: z.boolean().optional(),
  allowsOther: z.boolean().optional(),
});

export type ChecklistTemplateItemInput = z.infer<typeof checklistTemplateItemSchema>;
