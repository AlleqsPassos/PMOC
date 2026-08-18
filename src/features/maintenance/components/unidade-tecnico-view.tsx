"use client";

import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Eye,
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
import { WorkBucketBadge } from "@/components/shared/work-bucket-badge";
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
 * Fase 13 — em Concluídos, a preventiva é listada **por ambiente**, não por
 * aparelho: quatro linhas apontando para a mesma sala não são quatro destinos,
 * são a mesma tela repetida. Corretiva continua por equipamento, que é o que ela
 * é.
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

    const locationOf = (equipmentId: string) => {
      const eq = equipmentById.get(equipmentId);
      const environment = eq ? environmentById.get(eq.environmentId) : undefined;
      const sector = environment?.sectorId ? sectorById.get(environment.sectorId) : undefined;
      return {
        environmentId: eq?.environmentId ?? null,
        environmentName: environment?.name ?? null,
        sectorName: sector?.name ?? null,
        text:
          [sector?.name, environment?.name].filter(Boolean).join(" · ") ||
          "Sem localização registrada",
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

    /** Uma linha por equipamento — usado nos impedimentos, que são sempre pontuais. */
    const impedimentos = recordsInBucket(work, "impedimento")
      .map(({ record, workOrder }) => ({
        id: record.id,
        title: record.equipmentTag,
        subtitle: locationOf(record.equipmentId).text,
        href: `/ordens-servico/${workOrder.id}/atender/${record.id}`,
        workOrderOpen: workOrder.status !== "concluida" && workOrder.status !== "cancelada",
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    /**
     * Concluídos: preventiva agrupada por ambiente (a tela de destino cobre a
     * sala inteira), corretiva por equipamento (a tela é de um aparelho só).
     */
    const grouped = new Map<
      string,
      { id: string; title: string; subtitle: string; href: string; workOrderOpen: boolean; count: number }
    >();

    for (const { record, workOrder } of recordsInBucket(work, "concluido")) {
      const open = workOrder.status !== "concluida" && workOrder.status !== "cancelada";
      const location = locationOf(record.equipmentId);

      if (workOrder.type === "preventiva" && location.environmentId) {
        const key = `amb-${location.environmentId}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.count += 1;
          continue;
        }
        grouped.set(key, {
          id: key,
          title: location.environmentName ?? "Ambiente",
          // Setor, quando existe — repetir o nome do ambiente como subtítulo do
          // próprio ambiente não informa nada. A contagem entra no render.
          subtitle: location.sectorName ?? "",
          href: `/minhas-atividades/${unitId}/preventivas/${location.environmentId}`,
          workOrderOpen: open,
          count: 1,
        });
        continue;
      }

      grouped.set(record.id, {
        id: record.id,
        title: record.equipmentTag,
        subtitle: location.text,
        href: `/ordens-servico/${workOrder.id}/atender/${record.id}`,
        workOrderOpen: open,
        count: 1,
      });
    }

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
      impedimentos,
      concluidos: Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title)),
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
                      Equipamentos parados
                    </CardTitle>
                    <CardDescription>
                      Aguardando peça ou com defeito aberto por você. A OS não
                      deve ser fechada com um destes pendente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {data.impedimentos.map((item) => (
                      <ItemRow key={item.id} item={item} tone="impedimento" />
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
                  Toque em visualizar para conferir ou corrigir o que foi
                  registrado.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.concluidos.map((item) => (
                  <ItemRow key={item.id} item={item} tone="concluido" showView />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type RowItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  workOrderOpen: boolean;
  count?: number;
};

function ItemRow({
  item,
  tone,
  showView,
}: {
  item: RowItem;
  tone: "impedimento" | "concluido";
  showView?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="hover:bg-accent/50 flex items-center justify-between gap-3 rounded-md border p-3 transition-colors"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{item.title}</p>
        <p className="text-muted-foreground truncate text-sm">
          {[
            item.subtitle,
            item.count && item.count > 1 ? `${item.count} equipamentos` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        {!item.workOrderOpen && (
          <WorkBucketBadge tone="concluido">OS fechada</WorkBucketBadge>
        )}
        {tone === "impedimento" && (
          <WorkBucketBadge tone="impedimento">Parado</WorkBucketBadge>
        )}
        {showView && (
          <span className="text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <Eye className="size-3.5" />
            Visualizar
          </span>
        )}
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
