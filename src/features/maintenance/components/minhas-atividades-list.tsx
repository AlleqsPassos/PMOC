"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, FileCheck2, Headset, Wrench } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import {
  loadOpenWorkByUnit,
  pendingCount,
  readyToClose,
} from "@/features/maintenance/offline-queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * "Meu dia" do técnico — lido do Dexie (`useLiveQuery`), não do servidor:
 * funciona 100% offline depois do primeiro pull (ver
 * `src/lib/offline/pull-sync.ts`). O Server Component da página só decide *se*
 * cada seção aparece (checagem de permissão, que continua sendo fronteira de
 * segurança server-side); os dados em si vêm sempre local.
 *
 * Fase 10 — a home lista **só as unidades**, com o resumo do que há em cada uma.
 * A Fase 9 listava as tarefas dentro do cartão da unidade; o usuário pediu para
 * tirar, pensando em quantas unidades o sistema vai ter: o técnico escolhe onde
 * está e só então vê o trabalho.
 */
export function MinhasAtividadesList({
  canViewTickets,
  canViewWorkOrders,
}: {
  canViewTickets: boolean;
  canViewWorkOrders: boolean;
}) {
  const units = useLiveQuery(async () => {
    const [byUnit, units] = await Promise.all([
      loadOpenWorkByUnit(),
      offlineDb.units.toArray(),
    ]);
    const unitById = new Map(units.map((u) => [u.id, u]));

    return Array.from(byUnit.entries())
      .map(([unitId, work]) => {
        // Nome vem da tabela de unidades, não do desnormalizado da OS: uma
        // unidade que só tem chamado atribuído não tem OS de onde tirar o nome.
        const unit = unitById.get(unitId);
        const anyWorkOrder = work.workOrders[0];

        let preventivas = 0;
        let corretivas = 0;
        let prontasParaFechar = 0;

        if (canViewWorkOrders) {
          for (const workOrder of work.workOrders) {
            const records = work.recordsByWorkOrder.get(workOrder.id) ?? [];
            const pending = pendingCount(records);
            if (workOrder.type === "preventiva") preventivas += pending;
            else corretivas += pending;
            if (readyToClose(records)) prontasParaFechar += 1;
          }
        }

        return {
          unitId,
          unitName: unit?.name ?? anyWorkOrder?.unitName ?? "Unidade",
          clientName: unit?.clientName ?? anyWorkOrder?.clientName ?? "",
          preventivas,
          corretivas,
          chamados: canViewTickets ? work.openTicketCount : 0,
          prontasParaFechar,
        };
      })
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [canViewTickets, canViewWorkOrders]);

  // useLiveQuery retorna undefined até a primeira leitura do IndexedDB resolver.
  if (!units) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (units.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Nada atribuído a você no momento. Quando o administrador designar uma
          ordem de serviço ou um chamado, a unidade aparece aqui.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {units.map((unit) => (
        <Link key={unit.unitId} href={`/minhas-atividades/${unit.unitId}`}>
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{unit.unitName}</CardTitle>
                  <p className="text-muted-foreground truncate text-sm">
                    {unit.clientName}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {unit.preventivas > 0 && (
                <Badge variant="outline" className="gap-1">
                  <CalendarClock className="size-3" />
                  {unit.preventivas} em preventiva
                </Badge>
              )}
              {unit.corretivas > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Wrench className="size-3" />
                  {unit.corretivas} em corretiva
                </Badge>
              )}
              {unit.chamados > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Headset className="size-3" />
                  {unit.chamados} chamado{unit.chamados > 1 ? "s" : ""}
                </Badge>
              )}
              {unit.prontasParaFechar > 0 && (
                <Badge className="gap-1">
                  <FileCheck2 className="size-3" />
                  {unit.prontasParaFechar} OS pronta
                  {unit.prontasParaFechar > 1 ? "s" : ""} para fechar
                </Badge>
              )}
              {unit.preventivas === 0 &&
                unit.corretivas === 0 &&
                unit.chamados === 0 &&
                unit.prontasParaFechar === 0 && (
                  <span className="text-muted-foreground text-sm">
                    Serviço em andamento nesta unidade.
                  </span>
                )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
