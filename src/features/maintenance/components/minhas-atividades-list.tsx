"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import {
  bucketCounts,
  loadWorkByUnit,
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
 *
 * Fase 11 — o resumo passou a ser o das três divisões (em aberto, impedimento,
 * concluído) e a unidade **continua listada depois de tudo concluído**. Antes
 * ela desaparecia junto com a última OS fechada, e com ela o único caminho que o
 * técnico tinha para rever ou corrigir o próprio registro.
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
      loadWorkByUnit(),
      offlineDb.units.toArray(),
    ]);
    const unitById = new Map(units.map((u) => [u.id, u]));

    return Array.from(byUnit.entries())
      .map(([unitId, work]) => {
        // Nome vem da tabela de unidades, não do desnormalizado da OS: uma
        // unidade que só tem chamado atribuído não tem OS de onde tirar o nome.
        const unit = unitById.get(unitId);
        const anyWorkOrder = work.workOrders[0];
        const counts = bucketCounts(work);

        const prontasParaFechar = canViewWorkOrders
          ? work.openWorkOrders.filter((w) =>
              readyToClose(work.recordsByWorkOrder.get(w.id) ?? []),
            ).length
          : 0;

        return {
          unitId,
          unitName: unit?.name ?? anyWorkOrder?.unitName ?? "Unidade",
          clientName: unit?.clientName ?? anyWorkOrder?.clientName ?? "",
          aberto: canViewWorkOrders ? counts.aberto : 0,
          impedimento: canViewTickets ? counts.impedimento : 0,
          concluido: canViewWorkOrders ? counts.concluido : 0,
          prontasParaFechar,
        };
      })
      // Unidade com trabalho a fazer primeiro; a que só tem histórico desce.
      .sort(
        (a, b) =>
          Number(b.aberto > 0) - Number(a.aberto > 0) ||
          a.unitName.localeCompare(b.unitName),
      );
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
              {unit.aberto > 0 && (
                <Badge variant="outline" className="gap-1">
                  <ListChecks className="size-3" />
                  {unit.aberto} em aberto
                </Badge>
              )}
              {unit.impedimento > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <TriangleAlert className="size-3" />
                  {unit.impedimento} impedimento
                  {unit.impedimento > 1 ? "s" : ""}
                </Badge>
              )}
              {unit.concluido > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  {unit.concluido} concluído{unit.concluido > 1 ? "s" : ""}
                </Badge>
              )}
              {unit.prontasParaFechar > 0 && (
                <Badge className="gap-1">
                  <FileCheck2 className="size-3" />
                  {unit.prontasParaFechar} OS pronta
                  {unit.prontasParaFechar > 1 ? "s" : ""} para fechar
                </Badge>
              )}
              {unit.aberto === 0 &&
                unit.impedimento === 0 &&
                unit.concluido === 0 &&
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
