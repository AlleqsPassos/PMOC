"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createPartsRequest,
  type PartsRequestFormState,
} from "@/features/parts-requests/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

export function PartsRequestForm({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createPartsRequest.bind(null, workOrderId, maintenanceRecordId);
  const [state, formAction, pending] = useActionState<PartsRequestFormState, FormData>(
    action,
    undefined,
  );

  useCloseOnSuccess(state, () => formRef.current?.reset());

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="partName">Peça</Label>
        <Input id="partName" name="partName" placeholder="ex: Capacitor 35uF" required />
        {state?.fieldErrors?.partName && (
          <p className="text-destructive text-sm">{state.fieldErrors.partName[0]}</p>
        )}
      </div>
      <div className="flex w-20 flex-col gap-1.5">
        <Label htmlFor="quantity">Qtd.</Label>
        <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enviando…" : "Solicitar peça"}
      </Button>
      {state?.error && <p className="text-destructive w-full text-sm">{state.error}</p>}
    </form>
  );
}
