"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMeasurementOffline } from "@/features/maintenance/offline-actions";
import type { OfflineMeasurement, OfflineMeasurementType } from "@/lib/offline/db";

export function MeasurementSection({
  recordId,
  measurements,
  types,
}: {
  recordId: string;
  measurements: OfflineMeasurement[];
  types: OfflineMeasurementType[];
}) {
  const [typeId, setTypeId] = useState("");
  const [isSaving, startSaving] = useTransition();
  const valueRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);

  const selectedType = types.find((t) => t.id === typeId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedType) return;
    const rawValue = valueRef.current?.value ?? "";
    const unit = unitRef.current?.value || null;

    startSaving(async () => {
      await addMeasurementOffline(recordId, {
        measurementTypeId: selectedType.id,
        typeLabel: selectedType.label,
        valueNumeric: selectedType.dataType === "numeric" && rawValue ? Number(rawValue) : null,
        valueText: selectedType.dataType === "text" ? rawValue || null : null,
        unit,
        note: null,
      });
      if (valueRef.current) valueRef.current.value = "";
      setTypeId("");
    });
  }

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

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <Select value={typeId} onValueChange={setTypeId} required>
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

        <Input
          ref={valueRef}
          type={selectedType?.dataType === "text" ? "text" : "number"}
          step="any"
          placeholder="Valor"
          className="w-24"
        />

        <Input
          ref={unitRef}
          placeholder="Unidade"
          defaultValue={selectedType?.unitDefault ?? ""}
          key={selectedType?.id}
          className="w-24"
        />

        <Button type="submit" size="sm" disabled={isSaving || !typeId}>
          {isSaving ? "Salvando…" : "Registrar"}
        </Button>
      </form>
    </div>
  );
}
