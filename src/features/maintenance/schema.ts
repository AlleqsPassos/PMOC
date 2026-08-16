import { z } from "zod";

export const CHECKLIST_ITEM_STATUS = ["ok", "nao_ok", "nao_aplica"] as const;
export type ChecklistItemStatus = (typeof CHECKLIST_ITEM_STATUS)[number];

export const CHECKLIST_ITEM_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  ok: "OK",
  nao_ok: "Não OK",
  nao_aplica: "Não avaliado",
};

export const adhocChecklistItemSchema = z.object({
  label: z.string().min(1, { error: "Descreva o item." }),
});

export const measurementSchema = z.object({
  measurementTypeId: z.string().min(1, { error: "Selecione o tipo de medição." }),
  valueNumeric: z.string().optional(),
  valueText: z.string().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
});

export const maintenanceNarrativeSchema = z.object({
  causeIdentified: z.string().optional(),
  servicePerformed: z.string().optional(),
  recommendation: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

export type MaintenanceNarrativeInput = z.infer<typeof maintenanceNarrativeSchema>;
