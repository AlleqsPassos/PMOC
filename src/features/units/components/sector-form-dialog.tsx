"use client";

import { useActionState, useState } from "react";
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
import { createSector, updateSector, type UnitFormState } from "@/features/units/actions";
import type { SectorItem } from "@/features/units/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

type SectorFormDialogProps = { unitId: string } & (
  | { mode: "create" }
  | { mode: "edit"; sector: SectorItem }
);

export function SectorFormDialog(props: SectorFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create"
      ? createSector
      : updateSector.bind(null, props.sector.id, props.unitId);

  const [state, formAction, pending] = useActionState<UnitFormState, FormData>(
    action,
    undefined,
  );

  useCloseOnSuccess(state, () => setOpen(false));

  const defaults = props.mode === "edit" ? props.sector : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            Novo setor
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="unitId" value={props.unitId} />
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? "Novo setor" : "Editar setor"}
            </DialogTitle>
            <DialogDescription>
              Agrupamento opcional dentro da unidade (ex: &quot;Bloco cirúrgico&quot;).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector-name">Nome</Label>
            <Input
              id="sector-name"
              name="name"
              defaultValue={defaults?.name ?? ""}
              required
            />
            {state?.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector-notes">Observações</Label>
            <Textarea
              id="sector-notes"
              name="notes"
              rows={2}
              defaultValue={defaults?.notes ?? ""}
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : props.mode === "create" ? "Criar setor" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
