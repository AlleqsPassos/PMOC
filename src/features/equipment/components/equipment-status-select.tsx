"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setEquipmentStatus } from "@/features/equipment/actions";
import {
  EQUIPMENT_STATUS,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from "@/features/equipment/schema";

const STATUS_DOT: Record<EquipmentStatus, string> = {
  operacional: "bg-emerald-500",
  atencao: "bg-amber-500",
  em_manutencao: "bg-blue-500",
  inativo: "bg-muted-foreground",
};

export function EquipmentStatusSelect({
  equipmentId,
  status,
}: {
  equipmentId: string;
  status: EquipmentStatus;
}) {
  const [value, setValue] = useState<EquipmentStatus>(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    const nextStatus = next as EquipmentStatus;
    setValue(nextStatus);
    startTransition(async () => {
      await setEquipmentStatus(equipmentId, nextStatus);
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[150px]">
        <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[value]}`} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EQUIPMENT_STATUS.map((s) => (
          <SelectItem key={s} value={s}>
            {EQUIPMENT_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
