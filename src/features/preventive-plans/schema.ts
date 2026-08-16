import { z } from "zod";

export const PERIODICITY = [
  "semanal",
  "quinzenal",
  "mensal",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
  "personalizada",
] as const;
export type Periodicity = (typeof PERIODICITY)[number];

export const PERIODICITY_LABELS: Record<Periodicity, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  personalizada: "Personalizada",
};

export const preventivePlanSchema = z.object({
  clientId: z.string().min(1, { error: "Selecione um cliente." }),
  unitId: z.string().min(1, { error: "Selecione uma unidade." }),
  periodStart: z.string().min(1, { error: "Informe o início do período." }),
  periodEnd: z.string().min(1, { error: "Informe o fim do período." }),
  periodicity: z.enum(PERIODICITY, { error: "Selecione a periodicidade." }),
  assignedUserId: z.string().optional(),
  notes: z.string().optional(),
  equipmentIds: z
    .array(z.string())
    .min(1, { error: "Selecione ao menos um equipamento." }),
});

export type PreventivePlanInput = z.infer<typeof preventivePlanSchema>;
