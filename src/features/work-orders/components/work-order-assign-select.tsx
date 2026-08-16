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
import { assignWorkOrder } from "@/features/work-orders/actions";

const UNASSIGNED = "none";

export type AssignableUser = { id: string; fullName: string };

export function WorkOrderAssignSelect({
  workOrderId,
  assignedUserId,
  users,
}: {
  workOrderId: string;
  assignedUserId: string | null;
  users: AssignableUser[];
}) {
  const [value, setValue] = useState(assignedUserId ?? UNASSIGNED);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await assignWorkOrder(workOrderId, next === UNASSIGNED ? null : next);
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[200px]">
        <SelectValue placeholder="Não atribuído" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Não atribuído</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
