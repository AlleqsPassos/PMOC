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
import {
  createEnvironment,
  updateEnvironment,
  type UnitFormState,
} from "@/features/units/actions";
import type { EnvironmentItem, SectorItem } from "@/features/units/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

const NO_SECTOR = "none";

type EnvironmentFormDialogProps = {
  unitId: string;
  sectors: SectorItem[];
} & (
  | { mode: "create" }
  | { mode: "edit"; environment: EnvironmentItem }
);

export function EnvironmentFormDialog(props: EnvironmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create"
      ? createEnvironment
      : updateEnvironment.bind(null, props.environment.id, props.unitId);

  const [state, formAction, pending] = useActionState<UnitFormState, FormData>(
    action,
    undefined,
  );

  useCloseOnSuccess(state, () => setOpen(false));

  const defaults = props.mode === "edit" ? props.environment : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            Novo ambiente
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
              {props.mode === "create" ? "Novo ambiente" : "Editar ambiente"}
            </DialogTitle>
            <DialogDescription>
              Onde o equipamento fica de fato (ex: &quot;Sala 3&quot;). Setor é opcional.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="env-name">Nome</Label>
            <Input
              id="env-name"
              name="name"
              defaultValue={defaults?.name ?? ""}
              required
            />
            {state?.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          {props.sectors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sectorId">Setor</Label>
              <Select
                name="sectorId"
                defaultValue={defaults?.sectorId ?? NO_SECTOR}
              >
                <SelectTrigger className="w-full" id="sectorId">
                  <SelectValue placeholder="Sem setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SECTOR}>Sem setor</SelectItem>
                  {props.sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="env-notes">Observações</Label>
            <Textarea
              id="env-notes"
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
              {pending ? "Salvando…" : props.mode === "create" ? "Criar ambiente" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
