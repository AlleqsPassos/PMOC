import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_LABELS, type TicketStatus } from "@/features/tickets/schema";

const VARIANT: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  aberto: "outline",
  designado: "secondary",
  em_atendimento: "default",
  aguardando_peca: "secondary",
  aguardando_cliente: "secondary",
  concluido: "default",
  cancelado: "destructive",
};

/** Versão somente leitura de TicketStatusSelect — para quem não tem edit_tickets. */
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={VARIANT[status]}>{TICKET_STATUS_LABELS[status]}</Badge>;
}
