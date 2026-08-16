"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setWorkOrderStatus } from "@/features/work-orders/actions";
import {
  WORK_ORDER_STATUS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from "@/features/work-orders/schema";

/**
 * Mesmo padrão de TicketStatusSelect — inclui router.refresh() porque a
 * atribuição (WorkOrderAssignSelect) é outro componente que também pode
 * mexer em campos relacionados; manter os dois sincronizados sem depender
 * de reload manual (ver ticket-status-select.tsx, mesmo motivo).
 */
export function WorkOrderStatusSelect({
  workOrderId,
  status,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
}) {
  const [value, setValue] = useState<WorkOrderStatus>(status);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: string) {
    const nextStatus = next as WorkOrderStatus;
    setValue(nextStatus);
    startTransition(async () => {
      await setWorkOrderStatus(workOrderId, nextStatus);
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[170px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WORK_ORDER_STATUS.map((s) => (
          <SelectItem key={s} value={s}>
            {WORK_ORDER_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
