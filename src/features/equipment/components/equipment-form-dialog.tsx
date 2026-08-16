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
  createEquipment,
  updateEquipment,
  type EquipmentFormState,
} from "@/features/equipment/actions";
import type { EquipmentDetail } from "@/features/equipment/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

const NO_SECTOR = "none";

export type EquipmentUnitOption = { id: string; name: string; clientName: string };
export type EquipmentSectorOption = { id: string; name: string; unitId: string };
export type EquipmentEnvironmentOption = {
  id: string;
  name: string;
  unitId: string;
  sectorId: string | null;
};

type EquipmentFormDialogProps = {
  unitOptions: EquipmentUnitOption[];
  sectorOptions: EquipmentSectorOption[];
  environmentOptions: EquipmentEnvironmentOption[];
  /** Trava a unidade (ex: criado a partir da página de detalhe da unidade). */
  fixedUnitId?: string;
} & ({ mode: "create" } | { mode: "edit"; equipment: EquipmentDetail });

export function EquipmentFormDialog(props: EquipmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action =
    props.mode === "create"
      ? createEquipment
      : updateEquipment.bind(null, props.equipment.id);

  const [state, formAction, pending] = useActionState<
    EquipmentFormState,
    FormData
  >(action, undefined);

  const defaults = props.mode === "edit" ? props.equipment : null;

  const [unitId, setUnitId] = useState(props.fixedUnitId ?? defaults?.unitId ?? "");
  const [sectorId, setSectorId] = useState(defaults?.sectorId ?? NO_SECTOR);
  const [environmentId, setEnvironmentId] = useState(defaults?.environmentId ?? "");

  useCloseOnSuccess(state, () => setOpen(false));

  // Reseta os selects em cascata a cada reabertura do dialog — ajuste de
  // estado durante a renderização (não useEffect, ver use-close-on-success.ts)
  // comparando com o `open` do render anterior.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUnitId(props.fixedUnitId ?? defaults?.unitId ?? "");
      setSectorId(defaults?.sectorId ?? NO_SECTOR);
      setEnvironmentId(defaults?.environmentId ?? "");
    }
  }

  const sectorsForUnit = props.sectorOptions.filter((s) => s.unitId === unitId);
  const environmentsForUnit = props.environmentOptions.filter(
    (e) => e.unitId === unitId,
  );

  const fixedUnitLabel = props.fixedUnitId
    ? props.unitOptions.find((u) => u.id === props.fixedUnitId)
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Novo equipamento
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form action={formAction} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? "Novo equipamento" : "Editar equipamento"}
            </DialogTitle>
            <DialogDescription>
              Localização (unidade/setor/ambiente) e especificações técnicas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitId">Unidade</Label>
              {props.fixedUnitId ? (
                <>
                  <Input value={fixedUnitLabel?.name ?? ""} disabled />
                  <input type="hidden" name="unitId" value={props.fixedUnitId} />
                </>
              ) : (
                <Select
                  name="unitId"
                  value={unitId}
                  onValueChange={(v) => {
                    setUnitId(v);
                    setSectorId(NO_SECTOR);
                    setEnvironmentId("");
                  }}
                  required
                >
                  <SelectTrigger className="w-full" id="unitId">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.unitOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {state?.fieldErrors?.unitId && (
                <p className="text-destructive text-sm">{state.fieldErrors.unitId[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sectorId">Setor (opcional)</Label>
              <Select
                name="sectorId"
                value={sectorId}
                onValueChange={setSectorId}
                disabled={!unitId}
              >
                <SelectTrigger className="w-full" id="sectorId">
                  <SelectValue placeholder="Sem setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SECTOR}>Sem setor</SelectItem>
                  {sectorsForUnit.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="environmentId">Ambiente</Label>
              <Select
                name="environmentId"
                value={environmentId}
                onValueChange={setEnvironmentId}
                disabled={!unitId}
                required
              >
                <SelectTrigger className="w-full" id="environmentId">
                  <SelectValue placeholder="Selecione um ambiente" />
                </SelectTrigger>
                <SelectContent>
                  {environmentsForUnit.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {environmentsForUnit.length === 0 && unitId && (
                <p className="text-muted-foreground text-sm">
                  Esta unidade ainda não tem ambientes cadastrados.
                </p>
              )}
              {state?.fieldErrors?.environmentId && (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.environmentId[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tag">Tag</Label>
              <Input id="tag" name="tag" defaultValue={defaults?.tag ?? ""} required />
              {state?.fieldErrors?.tag && (
                <p className="text-destructive text-sm">{state.fieldErrors.tag[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Input id="type" name="type" defaultValue={defaults?.type ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" name="brand" defaultValue={defaults?.brand ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" name="model" defaultValue={defaults?.model ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serialNumber">Número de série</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                defaultValue={defaults?.serialNumber ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacityBtu">Capacidade (BTU)</Label>
              <Input
                id="capacityBtu"
                name="capacityBtu"
                type="number"
                defaultValue={defaults?.capacityBtu ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refrigerant">Gás refrigerante</Label>
              <Input
                id="refrigerant"
                name="refrigerant"
                defaultValue={defaults?.refrigerant ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voltage">Tensão</Label>
              <Input id="voltage" name="voltage" defaultValue={defaults?.voltage ?? ""} />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
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
                  ? "Criar equipamento"
                  : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
