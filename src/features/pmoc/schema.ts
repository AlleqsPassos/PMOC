import { z } from "zod";

export const PMOC_STATUS_LABELS = {
  draft: "Rascunho",
  generated: "Gerado",
} as const;

export const generatePmocSchema = z
  .object({
    clientId: z.string().min(1, { error: "Selecione um cliente." }),
    periodStart: z.string().min(1, { error: "Informe o início do período." }),
    periodEnd: z.string().min(1, { error: "Informe o fim do período." }),
    title: z.string().optional(),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    error: "O fim do período deve ser igual ou depois do início.",
    path: ["periodEnd"],
  });

export type GeneratePmocInput = z.infer<typeof generatePmocSchema>;
