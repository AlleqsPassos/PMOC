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

/**
 * As medições que a preventiva pede, na ordem em que aparecem na grade de cada
 * equipamento (Fase 10). São chaves de `measurement_types` — as três últimas
 * vêm do seed da Fase 4, as duas de temperatura foram criadas na 0041.
 *
 * A grade é fixa de propósito: o técnico preenche os mesmos cinco valores em
 * todo aparelho, e escolher o tipo num select a cada linha (como era antes)
 * transformava cinco toques em quinze.
 */
export const PREVENTIVE_MEASUREMENT_KEYS = [
  "temperatura_insuflamento",
  "temperatura_retorno",
  "corrente",
  "tensao",
  "pressao",
] as const;

/**
 * Como o técnico fecha o atendimento (Fase 10). `status` continua sendo o
 * ciclo de vida (`draft`/`completed`) — isto é o desfecho, e é o que diz ao
 * administrador se a OS ainda depende de material.
 */
export const MAINTENANCE_RESOLUTION = ["resolvido", "aguardando_peca"] as const;
export type MaintenanceResolution = (typeof MAINTENANCE_RESOLUTION)[number];

export const MAINTENANCE_RESOLUTION_LABELS: Record<MaintenanceResolution, string> = {
  resolvido: "Resolvido",
  aguardando_peca: "Aguardando peça",
};

export const maintenanceNarrativeSchema = z.object({
  causeIdentified: z.string().optional(),
  servicePerformed: z.string().optional(),
  recommendation: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

export type MaintenanceNarrativeInput = z.infer<typeof maintenanceNarrativeSchema>;
