import { z } from "zod";

export const unitSchema = z.object({
  clientId: z.string().min(1, { error: "Selecione um cliente." }),
  name: z.string().min(2, { error: "Informe o nome da unidade." }),
  responsibleName: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type UnitInput = z.infer<typeof unitSchema>;

export const sectorSchema = z.object({
  unitId: z.string().min(1),
  name: z.string().min(2, { error: "Informe o nome do setor." }),
  notes: z.string().optional(),
});

export type SectorInput = z.infer<typeof sectorSchema>;

export const environmentSchema = z.object({
  unitId: z.string().min(1),
  // "" = sem setor (Unidade -> Ambiente direto, ver seção 3/4 da arquitetura).
  sectorId: z.string().optional(),
  name: z.string().min(2, { error: "Informe o nome do ambiente." }),
  notes: z.string().optional(),
});

export type EnvironmentInput = z.infer<typeof environmentSchema>;
