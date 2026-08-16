"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createPreventivePlan,
  updatePreventivePlan,
  type PreventivePlanFormState,
} from "@/features/preventive-plans/actions";
import { PERIODICITY, PERIODICITY_LABELS } from "@/features/preventive-plans/schema";
import type { PreventivePlanDetail } from "@/features/preventive-plans/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

const NONE = "none";

type ClientOption = { id: string; corporateName: string };
type UnitOption = { id: string; name: string; clientId: string };
type EquipmentOption = { id: string; tag: string; unitId: string };
type AssignableUser = { id: string; fullName: string };

type PreventivePlanFormDialogProps = {
  clientOptions: ClientOption[];
  unitOptions: UnitOption[];
  equipmentOptions: EquipmentOption[];
  users: AssignableUser[];
} & ({ mode: "create" } | { mode: "edit"; plan: PreventivePlanDetail });

export function PreventivePlanFormDialog(props: PreventivePlanFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create"
      ? createPreventivePlan
      : updatePreventivePlan.bind(null, props.plan.id);

  const [state, formAction, pending] = useActionState<
    PreventivePlanFormState,
    FormData
  >(action, undefined);

  const defaults = props.mode === "edit" ? props.plan : null;

  const [clientId, setClientId] = useState(defaults?.clientId ?? "");
  const [unitId, setUnitId] = useState(defaults?.unitId ?? "");

  useCloseOnSuccess(state, () => setOpen(false));

  // Reseta a cascata a cada reabertura — ajuste de estado durante a
  // renderização (não useEffect, ver use-close-on-success.ts).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setClientId(defaults?.clientId ?? "");
      setUnitId(defaults?.unitId ?? "");
    }
  }

  const unitsForClient = props.unitOptions.filter((u) => u.clientId === clientId);
  const equipmentForUnit = props.equipmentOptions.filter((e) => e.unitId === unitId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Novo plano preventivo
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          action={formAction}
          className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1"
        >
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? "Novo plano preventivo" : "Editar plano preventivo"}
            </DialogTitle>
            <DialogDescription>
              Agenda recorrente que agrupa os equipamentos cobertos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="clientId">Cliente</Label>
              <Select
                name="clientId"
                value={clientId}
                onValueChange={(v) => {
                  setClientId(v);
                  setUnitId("");
                }}
                required
              >
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
              {state?.fieldErrors?.clientId && (
                <p className="text-destructive text-sm">{state.fieldErrors.clientId[0]}</p>
              )}
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="unitId">Unidade</Label>
              <Select
                name="unitId"
                value={unitId}
                onValueChange={setUnitId}
                disabled={!clientId}
                required
              >
                <SelectTrigger className="w-full" id="unitId">
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unitsForClient.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.fieldErrors?.unitId && (
                <p className="text-destructive text-sm">{state.fieldErrors.unitId[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="periodStart">Início</Label>
              <Input
                id="periodStart"
                name="periodStart"
                type="date"
                defaultValue={defaults?.periodStart ?? ""}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="periodEnd">Fim</Label>
              <Input
                id="periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={defaults?.periodEnd ?? ""}
                required
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="periodicity">Periodicidade</Label>
              <Select name="periodicity" defaultValue={defaults?.periodicity} required>
                <SelectTrigger className="w-full" id="periodicity">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICITY.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIODICITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="assignedUserId">Técnico responsável (opcional)</Label>
              <Select name="assignedUserId" defaultValue={defaults?.assignedUserId ?? NONE}>
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

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Equipamentos cobertos</Label>
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                {!unitId && (
                  <p className="text-muted-foreground text-sm">Selecione a unidade primeiro.</p>
                )}
                {unitId && equipmentForUnit.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nenhum equipamento cadastrado nesta unidade.
                  </p>
                )}
                {equipmentForUnit.map((eq) => (
                  <label key={eq.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      name="equipmentIds"
                      value={eq.id}
                      defaultChecked={defaults?.equipmentIds.includes(eq.id)}
                    />
                    {eq.tag}
                  </label>
                ))}
              </div>
              {state?.fieldErrors?.equipmentIds && (
                <p className="text-destructive text-sm">{state.fieldErrors.equipmentIds[0]}</p>
              )}
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ""} />
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : props.mode === "create" ? "Criar plano" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
