"use client";

import { useActionState, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMeasurement, type MaintenanceFormState } from "@/features/maintenance/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";
import type { MeasurementRow, MeasurementTypeOption } from "@/features/maintenance/queries";

export function MeasurementSection({
  workOrderId,
  recordId,
  measurements,
  types,
}: {
  workOrderId: string;
  recordId: string;
  measurements: MeasurementRow[];
  types: MeasurementTypeOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [typeId, setTypeId] = useState("");
  const action = addMeasurement.bind(null, recordId, workOrderId);
  const [state, formAction, pending] = useActionState<MaintenanceFormState, FormData>(
    action,
    undefined,
  );
  useCloseOnSuccess(state, () => {
    formRef.current?.reset();
    setTypeId("");
  });

  const selectedType = types.find((t) => t.id === typeId);

  return (
    <div className="flex flex-col gap-3">
      {measurements.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma medição registrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {measurements.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.typeLabel}</span>
              <span className="text-muted-foreground">
                {m.valueNumeric ?? m.valueText ?? "—"} {m.unit ?? ""}
              </span>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
        <Select
          name="measurementTypeId"
          value={typeId}
          onValueChange={setTypeId}
          required
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedType?.dataType === "text" ? (
          <Input name="valueText" placeholder="Valor" className="w-32" />
        ) : (
          <Input name="valueNumeric" type="number" step="any" placeholder="Valor" className="w-24" />
        )}

        <Input
          name="unit"
          placeholder="Unidade"
          defaultValue={selectedType?.unitDefault ?? ""}
          key={selectedType?.id}
          className="w-24"
        />

        <Button type="submit" size="sm" disabled={pending || !typeId}>
          {pending ? "Salvando…" : "Registrar"}
        </Button>
      </form>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
    </div>
  );
}
