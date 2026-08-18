"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateMaintenanceNarrativeOffline } from "@/features/maintenance/offline-actions";
import type { OfflineMaintenanceRecord } from "@/lib/offline/db";

/**
 * O laudo, do ponto de vista do técnico: **diagnóstico, recomendação,
 * observações** (Fase 10). Eram cinco campos; `causa identificada` e `serviço
 * realizado` saíram da tela porque o usuário descreveu três — as colunas
 * continuam no schema e o PDF do PMOC as renderiza se estiverem preenchidas,
 * e `updateMaintenanceNarrativeOffline` grava só o que recebe, justamente para
 * não zerá-las em registro antigo.
 */
export function NarrativeForm({
  record,
  disabled,
}: {
  record: OfflineMaintenanceRecord;
  disabled?: boolean;
}) {
  const [isSaving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [fields, setFields] = useState({
    diagnosis: record.diagnosis ?? "",
    recommendation: record.recommendation ?? "",
    notes: record.notes ?? "",
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    startSaving(async () => {
      await updateMaintenanceNarrativeOffline(record.id, {
        diagnosis: fields.diagnosis || null,
        recommendation: fields.recommendation || null,
        notes: fields.notes || null,
      });
      setSaved(true);
    });
  }

  function field(name: keyof typeof fields) {
    return {
      value: fields[name],
      disabled,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSaved(false);
        setFields((f) => ({ ...f, [name]: e.target.value }));
      },
    };
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="diagnosis">Diagnóstico</Label>
        <Textarea id="diagnosis" rows={3} {...field("diagnosis")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recommendation">Recomendação</Label>
        <Textarea id="recommendation" rows={2} {...field("recommendation")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={2} {...field("notes")} />
      </div>

      {saved && <p className="text-sm text-emerald-600">Laudo salvo.</p>}

      {!disabled && (
        <div>
          <Button type="submit" variant="outline" disabled={isSaving}>
            {isSaving ? "Salvando…" : "Salvar laudo"}
          </Button>
        </div>
      )}
    </form>
  );
}
