import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listTickets } from "@/features/tickets/queries";
import { listClientOptions } from "@/features/clients/queries";
import {
  listUnitOptions,
  listSectorOptions,
  listEnvironmentOptions,
} from "@/features/units/queries";
import { listEquipmentOptions } from "@/features/equipment/queries";
import { TicketFormDialog } from "@/features/tickets/components/ticket-form-dialog";
import { TicketFilters } from "@/features/tickets/components/ticket-filters";
import { TicketStatusSelect } from "@/features/tickets/components/ticket-status-select";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { TICKET_PRIORITY, TICKET_STATUS, type TicketPriority, type TicketStatus } from "@/features/tickets/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Chamados — PMOC+" };

function isTicketStatus(value: string | undefined): value is TicketStatus {
  return !!value && (TICKET_STATUS as readonly string[]).includes(value);
}

function isTicketPriority(value: string | undefined): value is TicketPriority {
  return !!value && (TICKET_PRIORITY as readonly string[]).includes(value);
}

export default async function ChamadosPage(props: PageProps<"/chamados">) {
  const searchParams = await props.searchParams;
  await requireUser();

  const canView = await hasPermission("view_tickets");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver chamados." />;
  }

  const clientId = typeof searchParams.clientId === "string" ? searchParams.clientId : undefined;
  const unitId = typeof searchParams.unitId === "string" ? searchParams.unitId : undefined;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const priorityParam = typeof searchParams.priority === "string" ? searchParams.priority : undefined;
  const status = isTicketStatus(statusParam) ? statusParam : undefined;
  const priority = isTicketPriority(priorityParam) ? priorityParam : undefined;

  const [
    tickets,
    clientOptions,
    unitOptions,
    sectorOptions,
    environmentOptions,
    equipmentOptions,
    canCreate,
    canEdit,
  ] = await Promise.all([
    listTickets({ clientId, unitId, status, priority }),
    listClientOptions(),
    listUnitOptions(),
    listSectorOptions(),
    listEnvironmentOptions(),
    listEquipmentOptions(),
    hasPermission("create_tickets"),
    hasPermission("edit_tickets"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chamados</h1>
          <p className="text-muted-foreground text-sm">
            Ocorrências reportadas por clientes ou abertas em campo pelos técnicos.
          </p>
        </div>
        {canCreate &&
          (clientOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Cadastre um cliente primeiro.</p>
          ) : (
            <TicketFormDialog
              mode="create"
              clientOptions={clientOptions}
              unitOptions={unitOptions}
              sectorOptions={sectorOptions}
              environmentOptions={environmentOptions}
              equipmentOptions={equipmentOptions}
            />
          ))}
      </div>

      <TicketFilters clientOptions={clientOptions} unitOptions={unitOptions} />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente / Unidade</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atribuído</TableHead>
                <TableHead>Aberto em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Nenhum chamado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link href={`/chamados/${t.id}`} className="hover:underline">
                        {t.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {t.clientName} — {t.unitName}
                    </TableCell>
                    <TableCell>
                      <TicketPriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <TicketStatusSelect key={t.status} ticketId={t.id} status={t.status} />
                      ) : (
                        <TicketStatusBadge status={t.status} />
                      )}
                    </TableCell>
                    <TableCell>{t.assignedName ?? "—"}</TableCell>
                    <TableCell>
                      {format(new Date(t.openedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
