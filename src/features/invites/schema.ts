import { z } from "zod";

export const createInviteSchema = z.object({
  fullName: z.string().min(2, { error: "Informe o nome completo." }),
  email: z
    .union([z.email({ error: "Informe um e-mail válido." }), z.literal("")])
    .optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const activateInviteSchema = z.object({
  code: z.string().min(1),
  fullName: z.string().min(2, { error: "Informe seu nome completo." }),
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z
    .string()
    .min(8, { error: "A senha deve ter ao menos 8 caracteres." }),
});

export type ActivateInviteInput = z.infer<typeof activateInviteSchema>;
