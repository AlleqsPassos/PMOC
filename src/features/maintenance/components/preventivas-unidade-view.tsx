"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { loadWorkByUnit } from "@/features/maintenance/offline-queries";
import { PageBackHeader } from "@/components/shared/page-back-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SEM_SETOR = "__sem_setor__";

/**
 * A preventiva da unidade, por **local** (Fase 10): o técnico escolhe a sala e
 * atende tudo que há dentro dela de uma vez.
 *
 * Agrupa por setor quando a unidade tem setores cadastrados e cai direto na
 * lista de ambientes quando não tem — a camada de setor é opcional no schema
 * desde a Fase 2, e boa parte dos dados reais nasce sem ela (o assistente de
 * cadastro da Fase 8 cria ambiente direto na unidade). Mostrar um cabeçalho
 * "Sem setor" sozinho seria ruído.
 */
export function PreventivasUnidadeView({ unitId }: { unitId: string }) {
  const data = useLiveQuery(async () => {
    const [byUnit, unit, equipment, environments, sectors] = await Promise.all([
      loadWorkByUnit(),
      offlineDb.units.get(unitId),
      offlineDb.equipment.where("unitId").equals(unitId).toArray(),
      offlineDb.environments.where("unitId").equals(unitId).toArray(),
      offlineDb.sectors.where("unitId").equals(unitId).toArray(),
    ]);

    const work = byUnit.get(unitId);
    const equipmentById = new Map(equipment.map((e) => [e.id, e]));
    const environmentById = new Map(environments.map((e) => [e.id, e]));

    // Um balde por ambiente que tenha equipamento nesta preventiva.
    const buckets = new Map<
      string,
      { environmentId: string; name: string; sectorId: string | null; total: number; pending: number }
    >();

    for (const workOrder of work?.openWorkOrders ?? []) {
      if (workOrder.type !== "preventiva") continue;
      for (const record of work?.recordsByWorkOrder.get(workOrder.id) ?? []) {
        const eq = equipmentById.get(record.equipmentId);
        if (!eq) continue;
        const environment = environmentById.get(eq.environmentId);
        const bucket = buckets.get(eq.environmentId) ?? {
          environmentId: eq.environmentId,
          name: environment?.name ?? "Ambiente",
          sectorId: environment?.sectorId ?? null,
          total: 0,
          pending: 0,
        };
        bucket.total += 1;
        if (record.status !== "completed") bucket.pending += 1;
        buckets.set(eq.environmentId, bucket);
      }
    }

    const list = Array.from(buckets.values()).sort((a, b) => a.name.localeCompare(b.name));
    const usedSectorIds = new Set(list.map((b) => b.sectorId).filter(Boolean));
    const groupBySector = usedSectorIds.size > 0;

    const sectorName = new Map(sectors.map((s) => [s.id, s.name]));
    const groups = groupBySector
      ? Array.from(
          list.reduce((acc, bucket) => {
            const key = bucket.sectorId ?? SEM_SETOR;
            const group = acc.get(key) ?? [];
            group.push(bucket);
            acc.set(key, group);
            return acc;
          }, new Map<string, typeof list>()),
        )
          .map(([key, items]) => ({
            key,
            name: key === SEM_SETOR ? "Sem setor" : (sectorName.get(key) ?? "Setor"),
            items,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [{ key: SEM_SETOR, name: "", items: list }];

    return { unitName: unit?.name ?? "Unidade", groups, isEmpty: list.length === 0 };
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
        title="Preventivas"
      />

      {data.isEmpty ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Nenhuma preventiva em aberto nesta unidade.
          </CardContent>
        </Card>
      ) : (
        data.groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            {group.name && (
              <h2 className="text-muted-foreground text-sm font-medium">{group.name}</h2>
            )}
            {group.items.map((item) => (
              <Link
                key={item.environmentId}
                href={`/minhas-atividades/${unitId}/preventivas/${item.environmentId}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {item.total} equipamento{item.total > 1 ? "s" : ""}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  {item.pending === 0 ? (
                    <Badge variant="secondary">Concluído</Badge>
                  ) : (
                    <Badge variant="outline">{item.pending} a fazer</Badge>
                  )}
                  <ChevronRight className="text-muted-foreground size-4" />
                </span>
              </Link>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
