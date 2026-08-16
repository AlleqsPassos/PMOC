import { z } from "zod";

export const WORK_ORDER_TYPE = ["corretiva", "preventiva"] as const;
export type WorkOrderType = (typeof WORK_ORDER_TYPE)[number];

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  corretiva: "Corretiva",
  preventiva: "Preventiva",
};

export const WORK_ORDER_STATUS = ["aberta", "em_andamento", "concluida", "cancelada"] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUS)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Geração a partir de um chamado — equipamento(s) escolhidos na hora (pelo menos 1). */
export const generateFromTicketSchema = z.object({
  title: z.string().min(3, { error: "Informe um título para a OS." }),
  equipmentIds: z
    .array(z.string())
    .min(1, { error: "Selecione ao menos um equipamento." }),
  scheduledDate: z.string().optional(),
  assignedUserId: z.string().optional(),
});

export type GenerateFromTicketInput = z.infer<typeof generateFromTicketSchema>;

/** Geração a partir de uma preventiva — equipamentos vêm do próprio plano. */
export const generateFromPreventivePlanSchema = z.object({
  title: z.string().min(3, { error: "Informe um título para a OS." }),
  scheduledDate: z.string().optional(),
  assignedUserId: z.string().optional(),
});

export type GenerateFromPreventivePlanInput = z.infer<
  typeof generateFromPreventivePlanSchema
>;
