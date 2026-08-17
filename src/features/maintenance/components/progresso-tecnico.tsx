"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import {
  isWorkOrderOpen,
  readyToClose,
  waitingForParts,
} from "@/features/maintenance/offline-queries";
import { CompleteWorkOrderButton } from "@/features/maintenance/components/complete-work-order-button";
import { WORK_ORDER_TYPE_LABELS, type WorkOrderType } from "@/features/work-orders/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Dashboard do técnico (Fase 9): "o quanto falta pra terminar", não um
 * panorama da empresa. Os cards antigos (equipamentos cadastrados, PMOCs
 * gerados, chamados urgentes da empresa) não dizem nada para quem está em
 * campo — quem os vê agora é só o despachante.
 *
 * Tudo local-first: o pull já traz os `maintenance_records` de todas as OS
 * dele, `draft` **e** `completed`, então o progresso é calculado sem rede.
 */
export function ProgressoTecnico() {
  const data = useLiveQuery(async () => {
    const [workOrders, records] = await Promise.all([
      offlineDb.workOrders.toArray(),
      offlineDb.maintenanceRecords.toArray(),
    ]);

    const byWorkOrder = new Map<string, typeof records>();
    for (const r of records) {
      byWorkOrder.set(r.workOrderId, [...(byWorkOrder.get(r.workOrderId) ?? []), r]);
    }

    const open = workOrders
      .filter(isWorkOrderOpen)
      .map((w) => {
        const list = byWorkOrder.get(w.id) ?? [];
        return {
          id: w.id,
          title: w.title,
          type: w.type,
          unitId: w.unitId,
          unitName: w.unitName,
          done: list.filter((r) => r.status === "completed").length,
          total: list.length,
          // O fechamento da OS é um botão do técnico (Fase 10), então o
          // Dashboard também precisa avisar quando não falta mais nada — senão
          // volta o defeito da Fase 9, com a OS esquecida aberta.
          closable: readyToClose(list),
          waitingParts: waitingForParts(list),
        };
      })
      // Mais adiantadas por último: o que ainda não começou é o que importa.
      .sort((a, b) => a.done / (a.total || 1) - b.done / (b.total || 1));

    const totalDone = open.reduce((sum, w) => sum + w.done, 0);
    const totalAll = open.reduce((sum, w) => sum + w.total, 0);

    return { open, totalDone, totalAll };
  }, []);

  if (!data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (data.open.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nenhuma ordem de serviço em aberto. Nada a fazer por aqui no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No total</CardTitle>
          <CardDescription>
            {data.totalDone} de {data.totalAll} equipamentos concluídos nas suas
            ordens de serviço em aberto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressBar done={data.totalDone} total={data.totalAll} />
        </CardContent>
      </Card>

      {data.open.map((wo) => (
        <Card key={wo.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{wo.title}</CardTitle>
              <Badge variant="outline">
                {WORK_ORDER_TYPE_LABELS[wo.type as WorkOrderType]}
              </Badge>
            </div>
            <CardDescription>
              <Link
                href={`/minhas-atividades/${wo.unitId}`}
                className="hover:underline"
              >
                {wo.unitName}
              </Link>{" "}
              · {wo.done} de {wo.total} concluídos
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ProgressBar done={wo.done} total={wo.total} />
            {wo.closable && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm">Tudo atendido — pode fechar.</span>
                <CompleteWorkOrderButton workOrderId={wo.id} title={wo.title} />
              </div>
            )}
            {wo.waitingParts && (
              <p className="text-muted-foreground text-sm">
                Tem equipamento aguardando peça — não feche ainda.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Barra simples com divs — o projeto não tem primitivo de progresso e não
 * vale uma dependência nova para isto (mesmo critério da compressão de imagem
 * da Fase 7, feita com canvas nativo). */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${done} de ${total} equipamentos concluídos`}
    >
      <div className="bg-primary h-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
