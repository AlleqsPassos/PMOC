"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { setMeasurementValueOffline } from "@/features/maintenance/offline-actions";
import type { OfflineMeasurement, OfflineMeasurementType } from "@/lib/offline/db";

/**
 * As cinco medições de um equipamento, já listadas e prontas para preencher
 * (Fase 10) — substitui o formulário "escolha o tipo, digite o valor, clique em
 * registrar" da Fase 4, que exigia três interações por medição.
 *
 * Salva **ao sair do campo**, não num botão: o técnico digita os cinco valores
 * em sequência e segue para o próximo aparelho; um botão por linha (ou um no
 * fim) seria mais um toque para errar ou esquecer. Como `setMeasurementValueOffline`
 * grava por cima, voltar e corrigir um valor atualiza a mesma medição.
 *
 * Input não-controlado com `defaultValue`: a tela inteira é `useLiveQuery` e
 * re-renderiza a cada gravação na fila — um input controlado lutaria com o que
 * o técnico está digitando.
 */
export function MeasurementGrid({
  recordId,
  types,
  measurements,
  disabled,
}: {
  recordId: string;
  types: OfflineMeasurementType[];
  measurements: OfflineMeasurement[];
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {types.map((type) => {
        const existing = measurements.find((m) => m.measurementTypeId === type.id);
        return (
          <label key={type.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground min-w-0 truncate">{type.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                className="h-9 w-24"
                disabled={disabled}
                defaultValue={existing?.valueNumeric ?? ""}
                key={existing?.id ?? "novo"}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const value = raw === "" ? null : Number(raw);
                  if (value !== null && Number.isNaN(value)) return;
                  if ((existing?.valueNumeric ?? null) === value) return;
                  startTransition(() =>
                    setMeasurementValueOffline({
                      recordId,
                      measurementTypeId: type.id,
                      typeLabel: type.label,
                      unit: existing?.unit ?? type.unitDefault,
                      valueNumeric: value,
                    }),
                  );
                }}
              />
              <span className="text-muted-foreground w-6 text-xs">
                {type.unitDefault ?? ""}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
