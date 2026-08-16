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
import { setTicketStatus } from "@/features/tickets/actions";
import { TICKET_STATUS, TICKET_STATUS_LABELS, type TicketStatus } from "@/features/tickets/schema";

/**
 * Mesmo padrão de EquipmentStatusSelect — muda direto, sem form/dialog. Aqui
 * chama router.refresh() ao final: diferente do equipamento, o status do
 * chamado também pode ser alterado de fora (TicketAssignSelect avança
 * aberto->designado ao atribuir) — sem o refresh, este select ficaria com
 * valor local desatualizado até a próxima navegação.
 */
export function TicketStatusSelect({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [value, setValue] = useState<TicketStatus>(status);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: string) {
    const nextStatus = next as TicketStatus;
    setValue(nextStatus);
    startTransition(async () => {
      await setTicketStatus(ticketId, nextStatus);
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TICKET_STATUS.map((s) => (
          <SelectItem key={s} value={s}>
            {TICKET_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
