import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getTicketById, getTicketTimeline } from "@/features/tickets/queries";
import { listCompanyUsers } from "@/features/users/queries";
import { TicketFormDialog } from "@/features/tickets/components/ticket-form-dialog";
import { TicketStatusSelect } from "@/features/tickets/components/ticket-status-select";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { TicketAssignSelect } from "@/features/tickets/components/ticket-assign-select";
import { TicketTimeline } from "@/features/tickets/components/ticket-timeline";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Chamado — PMOC+" };

export default async function ChamadoDetalhePage(
  props: PageProps<"/chamados/[ticketId]">,
) {
  const { ticketId } = await props.params;
  await requireUser();

  const canView = await hasPermission("view_tickets");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver chamados." />;
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket) notFound();

  const [timeline, companyUsers, canEdit, canAssign] = await Promise.all([
    getTicketTimeline(ticketId),
    listCompanyUsers(),
    hasPermission("edit_tickets"),
    hasPermission("assign_tickets"),
  ]);

  const assignableUsers = companyUsers
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, fullName: u.fullName }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/chamados" className="hover:underline">
            Chamados
          </Link>{" "}
          / {ticket.title}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <div className="flex items-center gap-2">
            {canEdit ? (
              // key=status força remontar quando o status muda por fora
              // (ex: TicketAssignSelect avança aberto->designado) — o
              // select guarda valor em useState local, não reagiria só ao
              // router.refresh().
              <TicketStatusSelect key={ticket.status} ticketId={ticket.id} status={ticket.status} />
            ) : (
              <TicketStatusBadge status={ticket.status} />
            )}
            {canEdit && <TicketFormDialog mode="edit" ticket={ticket} />}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Localização</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Cliente" value={ticket.clientName} />
            <Field
              label="Unidade"
              value={ticket.unitName}
              href={`/unidades/${ticket.unitId}`}
            />
            <Field label="Setor" value={ticket.sectorName} />
            <Field label="Ambiente" value={ticket.environmentName} />
            {ticket.equipmentTag && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Equipamento</p>
                <Link
                  href={`/equipamentos/${ticket.equipmentId}`}
                  className="hover:underline"
                >
                  {ticket.equipmentTag}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atribuição</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">Técnico designado</p>
              {canAssign ? (
                <TicketAssignSelect
                  ticketId={ticket.id}
                  assignedUserId={ticket.assignedUserId}
                  users={assignableUsers}
                />
              ) : (
                <p>{ticket.assignedName ?? "Não atribuído"}</p>
              )}
            </div>
            <Field label="Aberto por" value={ticket.openedByName} />
            <Field
              label="Aberto em"
              value={format(new Date(ticket.openedAt), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descrição</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {ticket.description || (
            <span className="text-muted-foreground">Nenhuma descrição informada.</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketTimeline entries={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      {value && href ? (
        <Link href={href} className="hover:underline">
          {value}
        </Link>
      ) : (
        <p>{value ?? "—"}</p>
      )}
    </div>
  );
}
