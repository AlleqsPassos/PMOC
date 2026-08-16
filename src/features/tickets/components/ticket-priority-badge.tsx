import { Badge } from "@/components/ui/badge";
import { TICKET_PRIORITY_LABELS, type TicketPriority } from "@/features/tickets/schema";

const VARIANT: Record<TicketPriority, "default" | "secondary" | "destructive" | "outline"> = {
  urgente: "destructive",
  alta: "default",
  media: "secondary",
  baixa: "outline",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={VARIANT[priority]}>{TICKET_PRIORITY_LABELS[priority]}</Badge>;
}
