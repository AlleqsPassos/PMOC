import { z } from "zod";

export const partCatalogItemSchema = z.object({
  name: z.string().min(2, { error: "Informe o nome da peça." }),
  unit: z.string().optional(),
});

export type PartCatalogItemInput = z.infer<typeof partCatalogItemSchema>;
