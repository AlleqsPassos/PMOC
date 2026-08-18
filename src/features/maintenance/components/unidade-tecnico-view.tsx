"use client";

import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Headset,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import {
  bucketCounts,
  loadWorkByUnit,
  pendingCount,
  readyToClose,
  recordsInBucket,
} from "@/features/maintenance/offline-queries";
import { CompleteWorkOrderButton } from "@/features/maintenance/components/complete-work-order-button";
import { type TicketStatus, type TicketPriority } from "@/features/tickets/schema";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { PageBackHeader } from "@/components/shared/page-back-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
 * Preventivas, Corretivas, Equipamentos.
 *
 * Fase 11 — o menu virou a aba **Em aberto**, e ao lado dela entraram
 * **Impedimentos** e **Concluídos**. A divisão mora aqui, e não no Início, pelo
 * motivo que o usuário deu: é dentro da unidade que ela separa alguma coisa —
 * no Início, com muitas unidades, ela só somaria números de lugares diferentes.
 *
 * **Guarda de escopo**: só abre se houver trabalho atribuído ao técnico nesta
 * unidade (em qualquer estado, inclusive já concluído — perder o acesso ao que
 * ele mesmo acabou de registrar era exatamente o defeito). A mensagem é "nada
 * atribuído aqui", não 404 — a unidade existe, ele só não tem trabalho nela. A
 * fronteira real continua sendo a RLS: o pull traz apenas as OS que são dele.
 */
export function UnidadeTecnicoView({ unitId }: { unitId: string }) {
  const data = useLiveQuery(async () => {
    const [byUnit, unit, equipment, environments, sectors] = await Promise.all([
      loadWorkByUnit(),
      offlineDb.units.get(unitId),
      offlineDb.equipment.where("unitId").equals(unitId).toArray(),
      offlineDb.environments.where("unitId").equals(unitId).toArray(),
      offlineDb.sectors.where("unitId").equals(unitId).toArray(),
    ]);

    const work = byUnit.get(unitId);
    if (!work) return { hasAccess: false as const };

    const equipmentById = new Map(equipment.map((e) => [e.id, e]));
    const environmentById = new Map(environments.map((e) => [e.id, e]));
    const sectorById = new Map(sectors.map((s) => [s.id, s]));

    /** Onde o aparelho está e por qual tela se chega ao atendimento dele. */
    const describe = (recordId: string, equipmentId: string, workOrder: { id: string; type: string }) => {
      const eq = equipmentById.get(equipmentId);
      const environment = eq ? environmentById.get(eq.environmentId) : undefined;
      const sector = environment?.sectorId ? sectorById.get(environment.sectorId) : undefined;
      return {
        location:
          [sector?.name, environment?.name].filter(Boolean).join(" · ") ||
          "Sem localização registrada",
        // Preventiva se atende por ambiente (a tela cobre vários aparelhos de
        // uma vez); corretiva, por registro.
        href:
          workOrder.type === "preventiva" && eq
            ? `/minhas-atividades/${unitId}/preventivas/${eq.environmentId}`
            : `/ordens-servico/${workOrder.id}/atender/${recordId}`,
      };
    };

    const openWorkOrders = work.openWorkOrders;
    const preventivas = openWorkOrders.filter((w) => w.type === "preventiva");
    const corretivas = openWorkOrders.filter((w) => w.type === "corretiva");
    const countPending = (list: typeof openWorkOrders) =>
      list.reduce(
        (total, w) => total + pendingCount(work.recordsByWorkOrder.get(w.id) ?? []),
        0,
      );

    const toItems = (bucket: "impedimento" | "concluido") =>
      recordsInBucket(work, bucket)
        .map(({ record, workOrder }) => ({
          id: record.id,
          tag: record.equipmentTag,
          workOrderTitle: workOrder.title,
          workOrderOpen: workOrder.status !== "concluida" && workOrder.status !== "cancelada",
          ...describe(record.id, record.equipmentId, workOrder),
        }))
        .sort((a, b) => a.tag.localeCompare(b.tag));

    return {
      hasAccess: true as const,
      unitName: unit?.name ?? work.workOrders[0]?.unitName ?? "Unidade",
      clientName: unit?.clientName ?? work.workOrders[0]?.clientName ?? "",
      counts: bucketCounts(work),
      preventivaCount: countPending(preventivas),
      preventivaWorkOrders: preventivas.length,
      corretivaCount: countPending(corretivas),
      corretivaWorkOrders: corretivas.length,
      equipmentCount: equipment.length,
      assignedTickets: work.assignedTickets,
      raisedTickets: work.raisedTickets,
      impedimentos: toItems("impedimento"),
      concluidos: toItems("concluido"),
      closable: openWorkOrders
        .filter((w) => readyToClose(work.recordsByWorkOrder.get(w.id) ?? []))
        .map((w) => ({ id: w.id, title: w.title })),
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
          Nada atribuído a você nesta unidade. Assim que o administrador designar
          uma ordem de serviço ou um chamado aqui, ela aparece no seu Início.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageBackHeader
        backHref="/minhas-atividades"
        backLabel="Início"
        title={data.unitName}
        subtitle={data.clientName}
      />

      {/* Sempre abre em "Em aberto" — decisão do usuário. A aba escolhida
          automaticamente pelo estado fazia a tela mudar de cara entre uma
          unidade e outra, e o técnico perdia a referência de onde estava. */}
      <Tabs defaultValue="aberto">
        <TabsList className="w-full">
          <TabsTrigger value="aberto">Em aberto ({data.counts.aberto})</TabsTrigger>
          <TabsTrigger value="impedimento">
            Impedimentos ({data.counts.impedimento})
          </TabsTrigger>
          <TabsTrigger value="concluido">
            Concluídos ({data.counts.concluido})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aberto" className="flex flex-col gap-4">
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

          {data.assignedTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Headset className="text-muted-foreground size-4" />
                  Chamados em aberto
                </CardTitle>
                <CardDescription>Ainda sem ordem de serviço gerada.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.assignedTickets.map((t) => (
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
        </TabsContent>

        <TabsContent value="impedimento" className="flex flex-col gap-4">
          {data.impedimentos.length === 0 && data.raisedTickets.length === 0 ? (
            <EmptyTab text="Nenhum impedimento ou equipamento aguardando peça nesta unidade." />
          ) : (
            <>
              {data.impedimentos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TriangleAlert className="text-destructive size-4" />
                      Aguardando peça
                    </CardTitle>
                    <CardDescription>
                      O atendimento foi registrado, mas o equipamento depende de
                      material. A OS não deve ser fechada com um destes em aberto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {data.impedimentos.map((item) => (
                      <RecordRow key={item.id} item={item} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {data.raisedTickets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Headset className="text-muted-foreground size-4" />
                      Corretivas que você abriu
                    </CardTitle>
                    <CardDescription>
                      Defeitos encontrados em campo, ainda aguardando ordem de
                      serviço do administrador.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {data.raisedTickets.map((t) => (
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
            </>
          )}
        </TabsContent>

        <TabsContent value="concluido" className="flex flex-col gap-4">
          {data.concluidos.length === 0 ? (
            <EmptyTab text="Nada concluído nesta unidade ainda." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="text-muted-foreground size-4" />
                  Atendimentos concluídos
                </CardTitle>
                <CardDescription>
                  Abra qualquer um para conferir ou corrigir o que foi
                  registrado.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.concluidos.map((item) => (
                  <RecordRow key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type RecordRowItem = {
  id: string;
  tag: string;
  location: string;
  href: string;
  workOrderTitle: string;
  workOrderOpen: boolean;
};

function RecordRow({ item }: { item: RecordRowItem }) {
  return (
    <Link
      href={item.href}
      className="hover:bg-accent/50 flex items-center justify-between gap-3 rounded-md border p-3 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-sm">{item.location}</p>
        <p className="truncate font-medium">{item.tag}</p>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        {!item.workOrderOpen && <Badge variant="outline">OS fechada</Badge>}
        <ChevronRight className="text-muted-foreground size-4" />
      </span>
    </Link>
  );
}

function EmptyTab({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-8 text-center text-sm">
        {text}
      </CardContent>
    </Card>
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
