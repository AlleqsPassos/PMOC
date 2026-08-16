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
import { assignTicket } from "@/features/tickets/actions";

const UNASSIGNED = "none";

export type AssignableUser = { id: string; fullName: string };

export function TicketAssignSelect({
  ticketId,
  assignedUserId,
  users,
}: {
  ticketId: string;
  assignedUserId: string | null;
  users: AssignableUser[];
}) {
  const [value, setValue] = useState(assignedUserId ?? UNASSIGNED);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await assignTicket(ticketId, next === UNASSIGNED ? null : next);
      // Atribuir pode avançar o status (aberto -> designado) por trás — o
      // refresh mantém o TicketStatusSelect (estado local próprio) em dia.
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
