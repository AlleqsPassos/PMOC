"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createUnit, updateUnit, type UnitFormState } from "@/features/units/actions";
import type { ClientOption } from "@/features/clients/queries";
import type { UnitDetail } from "@/features/units/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

type UnitFormDialogProps = {
  clientOptions: ClientOption[];
} & (
  | { mode: "create"; fixedClientId?: string; fixedClientName?: string }
  | { mode: "edit"; unit: UnitDetail }
);

export function UnitFormDialog(props: UnitFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create" ? createUnit : updateUnit.bind(null, props.unit.id);

  const [state, formAction, pending] = useActionState<UnitFormState, FormData>(
    action,
    undefined,
  );

  useCloseOnSuccess(state, () => setOpen(false));

  const defaults = props.mode === "edit" ? props.unit : null;
  const fixedClientName =
    props.mode === "create" ? props.fixedClientName : props.unit.clientName;
  const fixedClientId =
    props.mode === "create" ? props.fixedClientId : props.unit.clientId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Nova unidade
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
              {props.mode === "create" ? "Nova unidade" : "Editar unidade"}
            </DialogTitle>
            <DialogDescription>
              Unidade física do cliente (ex: um dos prédios do hospital).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientId">Cliente</Label>
            {fixedClientId ? (
              <>
                <Input value={fixedClientName ?? ""} disabled />
                <input type="hidden" name="clientId" value={fixedClientId} />
              </>
            ) : (
              <Select name="clientId" required>
                <SelectTrigger className="w-full" id="clientId">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {props.clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.corporateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {state?.fieldErrors?.clientId && (
              <p className="text-destructive text-sm">
                {state.fieldErrors.clientId[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome da unidade</Label>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ""} required />
            {state?.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="responsibleName">Responsável</Label>
              <Input
                id="responsibleName"
                name="responsibleName"
                defaultValue={defaults?.responsibleName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
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
                  ? "Criar unidade"
                  : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
