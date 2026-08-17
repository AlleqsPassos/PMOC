"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createPartsRequestOffline } from "@/features/parts-requests/offline-actions";
import { PartsCatalogPicker } from "@/features/parts-requests/components/parts-catalog-picker";

export function PartsRequestForm({
  workOrderId,
  maintenanceRecordId,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
}) {
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = partName.trim();
    if (!name) return;

    startTransition(async () => {
      await createPartsRequestOffline({
        workOrderId,
        maintenanceRecordId,
        partName: name,
        quantity: Number(quantity) || 1,
        note: null,
      });
      setPartName("");
      setQuantity("1");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <Label htmlFor="partName">Peça</Label>
        <PartsCatalogPicker id="partName" value={partName} onChange={setPartName} />
      </div>
      <div className="flex w-20 flex-col gap-1.5">
        <Label htmlFor="quantity">Qtd.</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending || !partName.trim()}>
        {isPending ? "Enviando…" : "Solicitar peça"}
      </Button>
    </form>
  );
}
