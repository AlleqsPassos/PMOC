"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { loadOpenWorkByUnit } from "@/features/maintenance/offline-queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Os equipamentos com corretiva em aberto na unidade (Fase 10), agregando todas
 * as OS corretivas dali — o técnico pensa "o que tem para consertar aqui", não
 * "quais são as ordens de serviço".
 *
 * A linha mostra **setor · ambiente · tag** e nada mais, como o usuário pediu:
 * marca e modelo não ajudam a *encontrar* o aparelho, localização sim. Os
 * detalhes ficam na tela do atendimento.
 */
export function CorretivasUnidadeView({ unitId }: { unitId: string }) {
  const data = useLiveQuery(async () => {
    const [byUnit, unit, equipment, environments, sectors] = await Promise.all([
      loadOpenWorkByUnit(),
      offlineDb.units.get(unitId),
      offlineDb.equipment.where("unitId").equals(unitId).toArray(),
      offlineDb.environments.where("unitId").equals(unitId).toArray(),
      offlineDb.sectors.where("unitId").equals(unitId).toArray(),
    ]);

    const work = byUnit.get(unitId);
    const equipmentById = new Map(equipment.map((e) => [e.id, e]));
    const environmentById = new Map(environments.map((e) => [e.id, e]));
    const sectorById = new Map(sectors.map((s) => [s.id, s]));

    const items = (work?.workOrders ?? [])
      .filter((w) => w.type === "corretiva")
      .flatMap((workOrder) =>
        (work?.recordsByWorkOrder.get(workOrder.id) ?? []).map((record) => {
          const eq = equipmentById.get(record.equipmentId);
          const environment = eq ? environmentById.get(eq.environmentId) : undefined;
          const sector = environment?.sectorId
            ? sectorById.get(environment.sectorId)
            : undefined;

          return {
            recordId: record.id,
            workOrderId: workOrder.id,
            workOrderTitle: workOrder.title,
            tag: record.equipmentTag,
            sectorName: sector?.name ?? null,
            environmentName: environment?.name ?? null,
            done: record.status === "completed",
            resolution: record.resolution,
          };
        }),
      )
      // Pendente primeiro — é o que ele abriu a tela para fazer.
      .sort((a, b) => Number(a.done) - Number(b.done) || a.tag.localeCompare(b.tag));

    return { unitName: unit?.name ?? "Unidade", items };
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/minhas-atividades" className="hover:underline">
            Início
          </Link>{" "}
          /{" "}
          <Link href={`/minhas-atividades/${unitId}`} className="hover:underline">
            {data.unitName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Corretivas</h1>
      </div>

      {data.items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Nenhuma corretiva em aberto nesta unidade.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((item) => (
            <Link
              key={item.recordId}
              href={`/ordens-servico/${item.workOrderId}/atender/${item.recordId}`}
              className="hover:bg-accent/50 flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-sm">
                  {[item.sectorName, item.environmentName].filter(Boolean).join(" · ") ||
                    "Sem localização registrada"}
                </p>
                <p className="truncate font-medium">{item.tag}</p>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                {item.done && (
                  <Badge variant="secondary">
                    {item.resolution === "aguardando_peca" ? "Aguardando peça" : "Concluído"}
                  </Badge>
                )}
                <ChevronRight className="text-muted-foreground size-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
