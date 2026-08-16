import { z } from "zod";

export const PARTS_REQUEST_STATUS = [
  "Solicitada",
  "Em andamento",
  "Aguardando",
  "Resolvida",
  "Cancelada",
] as const;
export type PartsRequestStatus = (typeof PARTS_REQUEST_STATUS)[number];

export const partsRequestSchema = z.object({
  partName: z.string().min(1, { error: "Informe o nome da peça." }),
  quantity: z.string().optional(),
  note: z.string().optional(),
});
