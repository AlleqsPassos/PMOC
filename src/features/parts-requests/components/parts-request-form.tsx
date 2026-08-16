"use client";

import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createPartsRequestOffline } from "@/features/parts-requests/offline-actions";

export function PartsRequestForm({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const partName = String(formData.get("partName") ?? "").trim();
    if (!partName) return;
    const quantity = Number(formData.get("quantity")) || 1;

    startTransition(async () => {
      await createPartsRequestOffline({
        workOrderId,
        maintenanceRecordId,
        partName,
        quantity,
        note: null,
      });
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="partName">Peça</Label>
        <Input id="partName" name="partName" placeholder="ex: Capacitor 35uF" required />
      </div>
      <div className="flex w-20 flex-col gap-1.5">
        <Label htmlFor="quantity">Qtd.</Label>
        <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Enviando…" : "Solicitar peça"}
      </Button>
    </form>
  );
}
