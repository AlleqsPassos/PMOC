import { z } from "zod";

export const clientSchema = z.object({
  corporateName: z.string().min(2, { error: "Informe a razão social." }),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .union([z.email({ error: "Informe um e-mail válido." }), z.literal("")])
    .optional(),
  responsibleName: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
