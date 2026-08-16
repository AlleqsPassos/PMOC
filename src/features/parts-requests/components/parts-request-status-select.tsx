"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePartsRequestStatus } from "@/features/parts-requests/actions";
import { PARTS_REQUEST_STATUS, type PartsRequestStatus } from "@/features/parts-requests/schema";

export function PartsRequestStatusSelect({
  requestId,
  workOrderId,
  status,
}: {
  requestId: string;
  workOrderId: string;
  status: PartsRequestStatus;
}) {
  const [value, setValue] = useState<PartsRequestStatus>(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    const nextStatus = next as PartsRequestStatus;
    setValue(nextStatus);
    startTransition(() => updatePartsRequestStatus(requestId, workOrderId, nextStatus));
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PARTS_REQUEST_STATUS.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
