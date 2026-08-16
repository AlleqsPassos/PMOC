"use client";

import { useActionState, useState } from "react";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  generateWorkOrderFromPreventivePlan,
  generateWorkOrderFromTicket,
  type WorkOrderFormState,
} from "@/features/work-orders/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

const NONE = "none";

type AssignableUser = { id: string; fullName: string };
type EquipmentOption = { id: string; tag: string };

type GenerateWorkOrderDialogProps =
  | {
      mode: "from-ticket";
      ticketId: string;
      defaultTitle: string;
      equipmentOptions: EquipmentOption[];
      defaultEquipmentId?: string | null;
      users: AssignableUser[];
    }
  | {
      mode: "from-preventive-plan";
      planId: string;
      defaultTitle: string;
      users: AssignableUser[];
    };

/**
 * Duas origens, uma ação: corretiva escolhe equipamento(s) na hora
 * (checkboxes, pelo menos 1); preventiva já traz o conjunto do plano — a
 * Server Action nem aceita equipmentIds nesse caso.
 */
export function GenerateWorkOrderDialog(props: GenerateWorkOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "from-ticket"
      ? generateWorkOrderFromTicket.bind(null, props.ticketId)
      : generateWorkOrderFromPreventivePlan.bind(null, props.planId);

  const [state, formAction, pending] = useActionState<WorkOrderFormState, FormData>(
    action,
    undefined,
  );

  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ClipboardPlus className="size-4" />
          Gerar OS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          action={formAction}
          className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1"
        >
          <DialogHeader>
            <DialogTitle>Gerar ordem de serviço</DialogTitle>
            <DialogDescription>
              {props.mode === "from-ticket"
                ? "Selecione os equipamentos cobertos por esta OS corretiva."
                : "OS preventiva — equipamentos já vinculados a este plano."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={props.defaultTitle} required />
            {state?.fieldErrors?.title && (
              <p className="text-destructive text-sm">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          {props.mode === "from-ticket" && (
            <div className="flex flex-col gap-1.5">
              <Label>Equipamentos</Label>
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                {props.equipmentOptions.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nenhum equipamento cadastrado nesta unidade.
                  </p>
                )}
                {props.equipmentOptions.map((eq) => (
                  <label key={eq.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      name="equipmentIds"
                      value={eq.id}
                      defaultChecked={eq.id === props.defaultEquipmentId}
                    />
                    {eq.tag}
                  </label>
                ))}
              </div>
              {state?.fieldErrors?.equipmentIds && (
                <p className="text-destructive text-sm">{state.fieldErrors.equipmentIds[0]}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduledDate">Data programada</Label>
              <Input id="scheduledDate" name="scheduledDate" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignedUserId">Técnico</Label>
              <Select name="assignedUserId" defaultValue={NONE}>
                <SelectTrigger className="w-full" id="assignedUserId">
                  <SelectValue placeholder="Não atribuído" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não atribuído</SelectItem>
                  {props.users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Gerando…" : "Gerar OS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
