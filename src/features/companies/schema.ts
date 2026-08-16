import { z } from "zod";

export const createCompanySchema = z.object({
  corporateName: z.string().min(2, { error: "Informe a razão social." }),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  adminFullName: z.string().min(2, { error: "Informe seu nome completo." }),
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z
    .string()
    .min(8, { error: "A senha deve ter ao menos 8 caracteres." }),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
