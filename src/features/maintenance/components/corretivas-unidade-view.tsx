"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { bucketOfRecord, impededEquipmentIds, loadWorkByUnit } from "@/features/maintenance/offline-queries";
import { PageBackHeader } from "@/components/shared/page-back-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Os equipamentos com corretiva em aberto na unidade (Fase 10), agregando todas
 * as OS corretivas dali — o técnico pensa "o que tem para consertar aqui", não
 * "quais são as ordens de serviço".
 *
 * A linha mostra **setor · ambiente · tag** e nada mais, como o usuário pediu:
 * marca e modelo não ajudam a *encontrar* o aparelho, localização sim. Os
 * detalhes ficam na tela do atendimento.
 *
 * Fase 11 — lista só o que ainda está **em aberto**. Concluído e aguardando
 * peça passaram a ter aba própria na unidade, e repeti-los aqui faria o mesmo
 * aparelho aparecer em dois lugares com significados diferentes.
 */
export function CorretivasUnidadeView({ unitId }: { unitId: string }) {
  const data = useLiveQuery(async () => {
    const [byUnit, unit, equipment, environments, sectors] = await Promise.all([
      loadWorkByUnit(),
      offlineDb.units.get(unitId),
      offlineDb.equipment.where("unitId").equals(unitId).toArray(),
      offlineDb.environments.where("unitId").equals(unitId).toArray(),
      offlineDb.sectors.where("unitId").equals(unitId).toArray(),
    ]);

    const work = byUnit.get(unitId);
    const impeded = work ? impededEquipmentIds(work) : new Set<string>();
    const equipmentById = new Map(equipment.map((e) => [e.id, e]));
    const environmentById = new Map(environments.map((e) => [e.id, e]));
    const sectorById = new Map(sectors.map((s) => [s.id, s]));

    const items = (work?.openWorkOrders ?? [])
      .filter((w) => w.type === "corretiva")
      .flatMap((workOrder) =>
        (work?.recordsByWorkOrder.get(workOrder.id) ?? [])
          .filter((record) => bucketOfRecord(record, impeded) === "aberto")
          .map((record) => {
            const eq = equipmentById.get(record.equipmentId);
            const environment = eq ? environmentById.get(eq.environmentId) : undefined;
            const sector = environment?.sectorId
              ? sectorById.get(environment.sectorId)
              : undefined;

            return {
              recordId: record.id,
              workOrderId: workOrder.id,
              tag: record.equipmentTag,
              sectorName: sector?.name ?? null,
              environmentName: environment?.name ?? null,
            };
          }),
      )
      .sort((a, b) => a.tag.localeCompare(b.tag));

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
      <PageBackHeader
        backHref={`/minhas-atividades/${unitId}`}
        backLabel={data.unitName}
        title="Corretivas"
      />

      {data.items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Nenhuma corretiva em aberto nesta unidade. O que já foi atendido está
            nas abas Impedimentos e Concluídos, na página da unidade.
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
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
