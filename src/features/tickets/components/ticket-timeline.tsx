import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TICKET_STATUS_LABELS } from "@/features/tickets/schema";
import type { TicketTimelineEntry } from "@/features/tickets/queries";

function describe(entry: TicketTimelineEntry): string {
  const who = entry.userName ?? "Sistema";

  if (entry.action === "insert") {
    return `Chamado criado por ${who}`;
  }

  if (entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus) {
    return `${who} mudou o status de "${TICKET_STATUS_LABELS[entry.previousStatus]}" para "${TICKET_STATUS_LABELS[entry.newStatus]}"`;
  }

  return `${who} atualizou o chamado`;
}

/** Deriva de audit_logs (via RPC get_ticket_timeline) — sem tabela própria. */
export function TicketTimeline({ entries }: { entries: TicketTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum evento registrado ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 pl-3">
          <p className="text-sm">{describe(entry)}</p>
          <p className="text-muted-foreground text-xs">
            {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </li>
      ))}
    </ol>
  );
}
