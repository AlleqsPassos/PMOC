"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  FileCheck2,
  Headset,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import {
  loadOpenWorkByUnit,
  pendingCount,
  readyToClose,
  waitingForParts,
} from "@/features/maintenance/offline-queries";
import { CompleteWorkOrderButton } from "@/features/maintenance/components/complete-work-order-button";
import { TICKET_CLOSED_STATUSES, type TicketStatus, type TicketPriority } from "@/features/tickets/schema";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * A unidade, do ponto de vista do técnico. Tudo local-first: lê do Dexie via
 * `useLiveQuery`, funciona sem rede depois do primeiro pull.
 *
 * Não reusa `/unidades/[unitId]` de propósito — aquela página é do
 * despachante: exige `view_units` (que o técnico não tem), é server-rendered
 * e traz editar/inativar unidade e CRUD de setores, que não fazem sentido em
 * campo.
 *
 * Fase 10 — deixou de listar equipamento por OS e virou um **menu**:
 * Preventivas, Corretivas, Equipamentos. É a hierarquia que o usuário
 * descreveu — dentro da unidade é que existem os dois tipos de manutenção.
 *
 * **Guarda de escopo**: só abre se houver OS ou chamado atribuído ao técnico
 * nesta unidade. A mensagem é "nada atribuído aqui", não 404 — a unidade
 * existe, ele só não tem trabalho nela. A fronteira real continua sendo a
 * RLS: o pull já traz apenas as OS que são dele.
 */
export function UnidadeTecnicoView({ unitId }: { unitId: string }) {
  const data = useLiveQuery(async () => {
    const [byUnit, unit, tickets, equipmentCount] = await Promise.all([
      loadOpenWorkByUnit(),
      offlineDb.units.get(unitId),
      offlineDb.tickets.toArray(),
      offlineDb.equipment.where("unitId").equals(unitId).count(),
    ]);

    const work = byUnit.get(unitId);
    const unitTickets = tickets.filter(
      (t) =>
        t.unitId === unitId &&
        !TICKET_CLOSED_STATUSES.includes(t.status as TicketStatus),
    );

    const workOrders = work?.workOrders ?? [];
    const preventivas = workOrders.filter((w) => w.type === "preventiva");
    const corretivas = workOrders.filter((w) => w.type === "corretiva");

    const countPending = (list: typeof workOrders) =>
      list.reduce(
        (total, w) => total + pendingCount(work?.recordsByWorkOrder.get(w.id) ?? []),
        0,
      );

    // OS cujo serviço acabou mas que seguem abertas — o técnico fecha por botão,
    // então esta lista é o que evita a OS esquecida.
    const closable = workOrders
      .filter((w) => readyToClose(work?.recordsByWorkOrder.get(w.id) ?? []))
      .map((w) => ({ id: w.id, title: w.title }));

    const pendingParts = workOrders
      .filter((w) => waitingForParts(work?.recordsByWorkOrder.get(w.id) ?? []))
      .map((w) => ({ id: w.id, title: w.title }));

    return {
      hasAccess: workOrders.length > 0 || unitTickets.length > 0,
      unitName: unit?.name ?? workOrders[0]?.unitName ?? "Unidade",
      clientName: unit?.clientName ?? workOrders[0]?.clientName ?? "",
      preventivaCount: countPending(preventivas),
      preventivaWorkOrders: preventivas.length,
      corretivaCount: countPending(corretivas),
      corretivaWorkOrders: corretivas.length,
      equipmentCount,
      tickets: unitTickets,
      closable,
      pendingParts,
    };
  }, [unitId]);

  if (!data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (!data.hasAccess) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nada atribuído a você nesta unidade. Assim que o administrador
          designar uma ordem de serviço ou um chamado aqui, ela aparece no seu
          Início.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/minhas-atividades" className="hover:underline">
            Início
          </Link>{" "}
          / {data.clientName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{data.unitName}</h1>
      </div>

      {data.closable.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="text-primary size-4" />
              Pronta para fechar
            </CardTitle>
            <CardDescription>
              Todos os equipamentos foram atendidos. Feche a OS para o
              administrador saber que acabou.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.closable.map((wo) => (
              <div
                key={wo.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <span className="min-w-0 font-medium">{wo.title}</span>
                <CompleteWorkOrderButton workOrderId={wo.id} title={wo.title} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.pendingParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="text-muted-foreground size-4" />
              Aguardando peça
            </CardTitle>
            <CardDescription>
              Tem equipamento parado esperando material — a OS não deve ser
              fechada ainda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {data.pendingParts.map((wo) => (
              <span key={wo.id}>{wo.title}</span>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <MenuEntry
          href={`/minhas-atividades/${unitId}/preventivas`}
          icon={CalendarClock}
          title="Preventivas"
          description={
            data.preventivaWorkOrders === 0
              ? "Nenhuma preventiva atribuída aqui."
              : data.preventivaCount === 0
                ? "Serviço concluído, aguardando fechamento."
                : `${data.preventivaCount} equipamento${data.preventivaCount > 1 ? "s" : ""} a atender.`
          }
          disabled={data.preventivaWorkOrders === 0}
        />
        <MenuEntry
          href={`/minhas-atividades/${unitId}/corretivas`}
          icon={Wrench}
          title="Corretivas"
          description={
            data.corretivaWorkOrders === 0
              ? "Nenhuma corretiva atribuída aqui."
              : data.corretivaCount === 0
                ? "Serviço concluído, aguardando fechamento."
                : `${data.corretivaCount} equipamento${data.corretivaCount > 1 ? "s" : ""} a atender.`
          }
          disabled={data.corretivaWorkOrders === 0}
        />
        <MenuEntry
          href={`/equipamentos?unidade=${unitId}`}
          icon={Wrench}
          title="Equipamentos"
          description={`${data.equipmentCount} cadastrado${data.equipmentCount === 1 ? "" : "s"} nesta unidade. Achou um que não está aqui? Cadastre.`}
        />
      </div>

      {data.tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headset className="text-muted-foreground size-4" />
              Chamados em aberto
            </CardTitle>
            <CardDescription>Ainda sem ordem de serviço gerada.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.tickets.map((t) => (
              <Link
                key={t.id}
                href={`/chamados/${t.id}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border p-3 text-sm transition-colors"
              >
                <span className="min-w-0 truncate">{t.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <TicketPriorityBadge priority={t.priority as TicketPriority} />
                  <TicketStatusBadge status={t.status as TicketStatus} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MenuEntry({
  href,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  href: string;
  icon: typeof Wrench;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="text-muted-foreground size-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {!disabled && <ChevronRight className="text-muted-foreground size-4 shrink-0" />}
    </div>
  );

  if (disabled) {
    return <div className="opacity-50">{body}</div>;
  }

  return (
    <Link href={href} className="hover:bg-accent/40 rounded-lg transition-colors">
      {body}
    </Link>
  );
}
