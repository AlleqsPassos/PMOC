"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createChecklistTemplate,
  updateChecklistTemplate,
  type ChecklistTemplateFormState,
} from "@/features/checklist-templates/actions";
import {
  MAINTENANCE_TYPE,
  MAINTENANCE_TYPE_LABELS,
} from "@/features/checklist-templates/schema";
import type { ChecklistTemplateDetail } from "@/features/checklist-templates/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

type ChecklistTemplateFormDialogProps =
  | { mode: "create" }
  | { mode: "edit"; template: ChecklistTemplateDetail };

export function ChecklistTemplateFormDialog(props: ChecklistTemplateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create"
      ? createChecklistTemplate
      : updateChecklistTemplate.bind(null, props.template.id);

  const [state, formAction, pending] = useActionState<
    ChecklistTemplateFormState,
    FormData
  >(action, undefined);

  useCloseOnSuccess(state, () => setOpen(false));

  const defaults = props.mode === "edit" ? props.template : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Novo template
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? "Novo template de checklist" : "Editar template"}
            </DialogTitle>
            <DialogDescription>
              Itens são adicionados depois de criar o template.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ""} required />
            {state?.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maintenanceType">Aplica-se a</Label>
            <Select
              name="maintenanceType"
              defaultValue={defaults?.maintenanceType ?? "ambos"}
              required
            >
              <SelectTrigger className="w-full" id="maintenanceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPE.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MAINTENANCE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipmentType">Tipo de equipamento (opcional)</Label>
            <Input
              id="equipmentType"
              name="equipmentType"
              placeholder="ex: Split, Chiller…"
              defaultValue={defaults?.equipmentType ?? ""}
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : props.mode === "create" ? "Criar template" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
