"use client";

import { useActionState, useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createInvite,
  type CreateInviteState,
} from "@/features/invites/actions";
import { inviteUrl } from "@/features/invites/invite-url";

export function InviteTechnicianForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateInviteState, FormData>(
    createInvite,
    undefined,
  );

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar — copie manualmente.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          Novo técnico
        </Button>
      </DialogTrigger>
      <DialogContent>
        {state?.code ? (
          <>
            <DialogHeader>
              <DialogTitle>Convite gerado</DialogTitle>
              <DialogDescription>
                Repasse este link ao técnico (WhatsApp, e-mail) — é só abrir
                e definir as próprias credenciais, nada pra digitar à mão.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted flex items-center justify-between gap-2 rounded-md p-3">
              <span className="truncate font-mono text-sm">{inviteUrl(state.code)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => copyLink(state.code!)}
                aria-label="Copiar link de convite"
                title="Copiar link"
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Convidar responsável técnico</DialogTitle>
              <DialogDescription>
                Gera um código de ativação vinculado à sua empresa.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" name="fullName" required />
              {state?.fieldErrors?.fullName && (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.fullName[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input id="email" name="email" type="email" />
            </div>

            {state?.error && (
              <p role="alert" className="text-destructive text-sm">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Gerando…" : "Gerar convite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
