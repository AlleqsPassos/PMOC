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
import { createTicket, updateTicket, type TicketFormState } from "@/features/tickets/actions";
import { TICKET_PRIORITY, TICKET_PRIORITY_LABELS } from "@/features/tickets/schema";
import type { TicketDetail } from "@/features/tickets/queries";
import type { ClientOption } from "@/features/clients/queries";
import type {
  EnvironmentOption,
  SectorOption,
  UnitOption,
} from "@/features/units/queries";
import type { EquipmentOption } from "@/features/equipment/queries";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

const NONE = "none";

type TicketFormDialogProps = {
  clientOptions?: ClientOption[];
  unitOptions?: UnitOption[];
  sectorOptions?: SectorOption[];
  environmentOptions?: EnvironmentOption[];
  equipmentOptions?: EquipmentOption[];
} & ({ mode: "create" } | { mode: "edit"; ticket: TicketDetail });

/**
 * Cobre as 2 formas online de criar/editar um chamado (seção 15, Fase 3):
 * - "create": admin/despachante, localização completa em cascata.
 * - "edit": só os campos narrativos (localização não é editável no MVP).
 * A criação ad-hoc do técnico a partir do equipamento é offline-first
 * desde a Fase 6 — ver TicketQuickFormDialog, componente separado.
 */
export function TicketFormDialog(props: TicketFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action = props.mode === "create" ? createTicket : updateTicket.bind(null, props.ticket.id);

  const [state, formAction, pending] = useActionState<TicketFormState, FormData>(
    action,
    undefined,
  );

  const defaults = props.mode === "edit" ? props.ticket : null;

  const [clientId, setClientId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [sectorId, setSectorId] = useState(NONE);
  const [environmentId, setEnvironmentId] = useState(NONE);
  const [equipmentId, setEquipmentId] = useState(NONE);

  useCloseOnSuccess(state, () => setOpen(false));

  // Reseta a cascata a cada reabertura — ajuste de estado durante a
  // renderização (não useEffect, ver use-close-on-success.ts).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setClientId("");
      setUnitId("");
      setSectorId(NONE);
      setEnvironmentId(NONE);
      setEquipmentId(NONE);
    }
  }

  const clientOptions = props.clientOptions ?? [];
  const unitOptions = props.unitOptions ?? [];
  const sectorOptions = props.sectorOptions ?? [];
  const environmentOptions = props.environmentOptions ?? [];
  const equipmentOptions = props.equipmentOptions ?? [];

  const unitsForClient = unitOptions.filter((u) => u.clientId === clientId);
  const sectorsForUnit = sectorOptions.filter((s) => s.unitId === unitId);
  const environmentsForUnit = environmentOptions.filter((e) => e.unitId === unitId);
  const equipmentForUnit = equipmentOptions.filter((e) => e.unitId === unitId);

  const dialogTitle = props.mode === "create" ? "Novo chamado" : "Editar chamado";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Novo chamado
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
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>Descreva o problema reportado.</DialogDescription>
          </DialogHeader>

          {props.mode === "create" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="clientId">Cliente</Label>
                <Select
                  name="clientId"
                  value={clientId}
                  onValueChange={(v) => {
                    setClientId(v);
                    setUnitId("");
                    setSectorId(NONE);
                    setEnvironmentId(NONE);
                    setEquipmentId(NONE);
                  }}
                  required
                >
                  <SelectTrigger className="w-full" id="clientId">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((c) => (
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
                  onValueChange={(v) => {
                    setUnitId(v);
                    setSectorId(NONE);
                    setEnvironmentId(NONE);
                    setEquipmentId(NONE);
                  }}
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
                    <SelectItem value={NONE}>Sem setor</SelectItem>
                    {sectorsForUnit.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="environmentId">Ambiente (opcional)</Label>
                <Select
                  name="environmentId"
                  value={environmentId}
                  onValueChange={setEnvironmentId}
                  disabled={!unitId}
                >
                  <SelectTrigger className="w-full" id="environmentId">
                    <SelectValue placeholder="Sem ambiente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem ambiente</SelectItem>
                    {environmentsForUnit.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="equipmentId">Equipamento (opcional)</Label>
                <Select
                  name="equipmentId"
                  value={equipmentId}
                  onValueChange={setEquipmentId}
                  disabled={!unitId}
                >
                  <SelectTrigger className="w-full" id="equipmentId">
                    <SelectValue placeholder="Sem equipamento vinculado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem equipamento vinculado</SelectItem>
                    {equipmentForUnit.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={defaults?.title ?? ""} required />
            {state?.fieldErrors?.title && (
              <p className="text-destructive text-sm">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={defaults?.description ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priority">Prioridade</Label>
            <Select name="priority" defaultValue={defaults?.priority ?? "media"}>
              <SelectTrigger className="w-full" id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITY.map((p) => (
                  <SelectItem key={p} value={p}>
                    {TICKET_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                : props.mode === "edit"
                  ? "Salvar alterações"
                  : "Abrir chamado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
