"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateInvite,
  type ActivateInviteState,
} from "@/features/invites/actions";

export function ActivateInviteForm({ code }: { code: string }) {
  const boundAction = activateInvite.bind(null, code);
  const [state, action, pending] = useActionState<ActivateInviteState, FormData>(
    boundAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
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
        <Input
          id="password"
          name="password"
          type="password"
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
