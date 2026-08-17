"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  activateInvite,
  type ActivateInviteState,
} from "@/features/invites/actions";

/**
 * `defaultCode` só pré-preenche o campo quando a pessoa chegou pela rota
 * /ativar-convite/[code]. O caminho divulgado é digitar o código na tela de
 * login, então o campo continua editável nos dois casos.
 */
export function ActivateInviteForm({ defaultCode }: { defaultCode?: string }) {
  const [state, action, pending] = useActionState<ActivateInviteState, FormData>(
    activateInvite,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Código do convite</Label>
        <Input
          id="code"
          name="code"
          defaultValue={defaultCode}
          required
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="Ex.: A7K2MPQ4"
          className="font-mono tracking-widest uppercase"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Seu nome completo</Label>
        <Input id="fullName" name="fullName" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Seu e-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Crie uma senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Ativando…" : "Ativar acesso"}
      </Button>
    </form>
  );
}
