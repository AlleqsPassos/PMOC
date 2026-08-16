import { z } from "zod";

export const TICKET_PRIORITY = ["urgente", "alta", "media", "baixa"] as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[number];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const TICKET_STATUS = [
  "aberto",
  "designado",
  "em_atendimento",
  "aguardando_peca",
  "aguardando_cliente",
  "concluido",
  "cancelado",
] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: "Aberto",
  designado: "Designado",
  em_atendimento: "Em atendimento",
  aguardando_peca: "Aguardando peça",
  aguardando_cliente: "Aguardando cliente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Estados que não aparecem mais na fila de trabalho ("Minhas atividades"). */
export const TICKET_CLOSED_STATUSES: TicketStatus[] = ["concluido", "cancelado"];

/** Criação pelo admin/despachante — localização completa em cascata. */
export const ticketSchema = z.object({
  clientId: z.string().min(1, { error: "Selecione um cliente." }),
  unitId: z.string().min(1, { error: "Selecione uma unidade." }),
  sectorId: z.string().optional(),
  environmentId: z.string().optional(),
  equipmentId: z.string().optional(),
  title: z.string().min(3, { error: "Descreva o problema em poucas palavras." }),
  description: z.string().optional(),
  priority: z.enum(TICKET_PRIORITY).optional(),
});

export type TicketInput = z.infer<typeof ticketSchema>;

/**
 * Criação ad-hoc a partir do equipamento (técnico em campo) e edição —
 * localização já vem de outro lugar (equipamentId fixo ou chamado
 * existente), então só os campos narrativos ficam no formulário.
 */
export const ticketQuickSchema = z.object({
  title: z.string().min(3, { error: "Descreva o problema em poucas palavras." }),
  description: z.string().optional(),
  priority: z.enum(TICKET_PRIORITY).optional(),
});

export type TicketQuickInput = z.infer<typeof ticketQuickSchema>;
