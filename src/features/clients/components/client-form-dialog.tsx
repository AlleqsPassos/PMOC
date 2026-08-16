"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createClient,
  updateClient,
  type ClientFormState,
} from "@/features/clients/actions";
import type { ClientDetail } from "@/features/clients/queries";

type ClientFormDialogProps =
  | { mode: "create" }
  | { mode: "edit"; client: ClientDetail };

export function ClientFormDialog(props: ClientFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create"
      ? createClient
      : updateClient.bind(null, props.client.id);

  const [state, formAction, pending] = useActionState<
    ClientFormState,
    FormData
  >(action, undefined);

  useCloseOnSuccess(state, () => setOpen(false));

  const defaults =
    props.mode === "edit"
      ? props.client
      : {
          corporateName: "",
          tradeName: "",
          cnpj: "",
          phone: "",
          email: "",
          responsibleName: "",
          notes: "",
        };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Novo cliente
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? "Novo cliente" : "Editar cliente"}
            </DialogTitle>
            <DialogDescription>
              Dados cadastrais do cliente atendido pela sua empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="corporateName">Razão social</Label>
              <Input
                id="corporateName"
                name="corporateName"
                defaultValue={
                  "corporateName" in defaults ? defaults.corporateName : ""
                }
                required
              />
              {state?.fieldErrors?.corporateName && (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.corporateName[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tradeName">Nome fantasia</Label>
              <Input
                id="tradeName"
                name="tradeName"
                defaultValue={defaults.tradeName ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={defaults.cnpj ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={defaults.phone ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaults.email ?? ""}
              />
              {state?.fieldErrors?.email && (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="responsibleName">Responsável</Label>
              <Input
                id="responsibleName"
                name="responsibleName"
                defaultValue={defaults.responsibleName ?? ""}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={defaults.notes ?? ""}
              />
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Salvando…"
                : props.mode === "create"
                  ? "Criar cliente"
                  : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
