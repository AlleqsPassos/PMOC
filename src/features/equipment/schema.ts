import { z } from "zod";

export const EQUIPMENT_STATUS = [
  "operacional",
  "atencao",
  "em_manutencao",
  "inativo",
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUS)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  operacional: "Operacional",
  atencao: "Atenção",
  em_manutencao: "Em manutenção",
  inativo: "Inativo",
};

export const equipmentSchema = z.object({
  unitId: z.string().min(1, { error: "Selecione uma unidade." }),
  sectorId: z.string().optional(),
  environmentId: z.string().min(1, { error: "Selecione um ambiente." }),
  tag: z.string().min(1, { error: "Informe a tag do equipamento." }),
  type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  capacityBtu: z.string().optional(),
  refrigerant: z.string().optional(),
  voltage: z.string().optional(),
  notes: z.string().optional(),
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;
