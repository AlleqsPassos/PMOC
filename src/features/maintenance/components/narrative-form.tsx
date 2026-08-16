"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateMaintenanceNarrativeOffline } from "@/features/maintenance/offline-actions";
import type { OfflineMaintenanceRecord } from "@/lib/offline/db";

export function NarrativeForm({ record }: { record: OfflineMaintenanceRecord }) {
  const [isSaving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [fields, setFields] = useState({
    causeIdentified: record.causeIdentified ?? "",
    servicePerformed: record.servicePerformed ?? "",
    recommendation: record.recommendation ?? "",
    diagnosis: record.diagnosis ?? "",
    notes: record.notes ?? "",
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    startSaving(async () => {
      await updateMaintenanceNarrativeOffline(record.id, {
        causeIdentified: fields.causeIdentified || null,
        servicePerformed: fields.servicePerformed || null,
        recommendation: fields.recommendation || null,
        diagnosis: fields.diagnosis || null,
        notes: fields.notes || null,
      });
      setSaved(true);
    });
  }

  function field(name: keyof typeof fields) {
    return {
      value: fields[name],
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSaved(false);
        setFields((f) => ({ ...f, [name]: e.target.value }));
      },
    };
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="causeIdentified">Causa identificada</Label>
          <Textarea id="causeIdentified" rows={2} {...field("causeIdentified")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="servicePerformed">Serviço realizado</Label>
          <Textarea id="servicePerformed" rows={2} {...field("servicePerformed")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recommendation">Recomendação</Label>
          <Textarea id="recommendation" rows={2} {...field("recommendation")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diagnosis">Diagnóstico</Label>
          <Textarea id="diagnosis" rows={2} {...field("diagnosis")} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" rows={2} {...field("notes")} />
        </div>
      </div>

      {saved && <p className="text-sm text-emerald-600">Laudo salvo.</p>}

      <div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando…" : "Salvar laudo"}
        </Button>
      </div>
    </form>
  );
}
