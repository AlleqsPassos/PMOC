"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateChecklistItemStatus } from "@/features/maintenance/actions";
import {
  CHECKLIST_ITEM_STATUS,
  CHECKLIST_ITEM_STATUS_LABELS,
  type ChecklistItemStatus,
} from "@/features/maintenance/schema";

const VARIANT: Record<ChecklistItemStatus, "default" | "destructive" | "outline"> = {
  ok: "default",
  nao_ok: "destructive",
  nao_aplica: "outline",
};

export function ChecklistItemRow({
  itemId,
  workOrderId,
  recordId,
  label,
  status,
  isAdhoc,
}: {
  itemId: string;
  workOrderId: string;
  recordId: string;
  label: string;
  status: ChecklistItemStatus;
  isAdhoc: boolean;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
      <span>
        {label}
        {isAdhoc && <span className="text-muted-foreground"> (outro)</span>}
      </span>
      <div className="flex gap-1">
        {CHECKLIST_ITEM_STATUS.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={value === s ? VARIANT[s] : "ghost"}
            disabled={isPending}
            onClick={() => {
              setValue(s);
              startTransition(() => updateChecklistItemStatus(itemId, workOrderId, recordId, s));
            }}
          >
            {CHECKLIST_ITEM_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>
    </div>
  );
}
