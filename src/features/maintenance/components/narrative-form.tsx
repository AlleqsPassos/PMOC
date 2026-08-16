"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  updateMaintenanceNarrative,
  type MaintenanceFormState,
} from "@/features/maintenance/actions";
import type { MaintenanceRecordDetail } from "@/features/maintenance/queries";

export function NarrativeForm({
  workOrderId,
  record,
}: {
  workOrderId: string;
  record: MaintenanceRecordDetail;
}) {
  const action = updateMaintenanceNarrative.bind(null, record.id, workOrderId);
  const [state, formAction, pending] = useActionState<MaintenanceFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="causeIdentified">Causa identificada</Label>
          <Textarea
            id="causeIdentified"
            name="causeIdentified"
            rows={2}
            defaultValue={record.causeIdentified ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="servicePerformed">Serviço realizado</Label>
          <Textarea
            id="servicePerformed"
            name="servicePerformed"
            rows={2}
            defaultValue={record.servicePerformed ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recommendation">Recomendação</Label>
          <Textarea
            id="recommendation"
            name="recommendation"
            rows={2}
            defaultValue={record.recommendation ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diagnosis">Diagnóstico</Label>
          <Textarea id="diagnosis" name="diagnosis" rows={2} defaultValue={record.diagnosis ?? ""} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={record.notes ?? ""} />
        </div>
      </div>

      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Laudo salvo.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar laudo"}
        </Button>
      </div>
    </form>
  );
}
