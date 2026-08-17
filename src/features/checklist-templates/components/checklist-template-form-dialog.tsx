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

type ChecklistTemplateFormDialogProps = (
  | { mode: "create" }
  | { mode: "edit"; template: ChecklistTemplateDetail }
) & {
  /** Tipos que existem no cadastro de equipamentos — ver `listEquipmentTypes`. */
  equipmentTypes: string[];
};

const NOVO_TIPO = "__novo__";
const SEM_TIPO = "__nenhum__";

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
  const [equipmentType, setEquipmentType] = useState(defaults?.equipmentType ?? "");
  const [typeMode, setTypeMode] = useState<"lista" | "novo">(
    // Template já salvo com um tipo que não existe mais no cadastro cai no campo
    // livre, para o valor não sumir silenciosamente ao editar outra coisa.
    defaults?.equipmentType && !props.equipmentTypes.includes(defaults.equipmentType)
      ? "novo"
      : "lista",
  );

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
            <Label htmlFor="equipmentType">Tipo de equipamento</Label>
            <Select
              value={
                typeMode === "novo"
                  ? NOVO_TIPO
                  : equipmentType === ""
                    ? SEM_TIPO
                    : equipmentType
              }
              onValueChange={(next) => {
                if (next === NOVO_TIPO) {
                  setTypeMode("novo");
                  setEquipmentType("");
                  return;
                }
                setTypeMode("lista");
                setEquipmentType(next === SEM_TIPO ? "" : next);
              }}
            >
              <SelectTrigger className="w-full" id="equipmentType">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_TIPO}>Qualquer equipamento</SelectItem>
                {props.equipmentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                <SelectItem value={NOVO_TIPO}>Outro tipo…</SelectItem>
              </SelectContent>
            </Select>
            {typeMode === "novo" && (
              <Input
                autoFocus
                placeholder="ex: Chiller"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                aria-label="Novo tipo de equipamento"
              />
            )}
            {/* O select acima é só a interface; o que a Server Action lê é este
                campo, que carrega o texto final (escolhido ou digitado). */}
            <input type="hidden" name="equipmentType" value={equipmentType} />
            <p className="text-muted-foreground text-xs">
              Define a qual categoria de equipamento este checklist se aplica na
              preventiva. O texto precisa bater com o tipo cadastrado no
              equipamento.
            </p>
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
