"use client";

import { useState } from "react";
import { useTransition } from "react";
import { AlertTriangle, CloudUpload, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { discardFailedEquipmentOffline } from "@/features/equipment/offline-actions";
import { EquipmentFieldFormDialog } from "@/features/equipment/components/equipment-field-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const TODAS = "__todas__";

/**
 * O catálogo de equipamentos pela ótica do técnico (Fase 10) — local-first,
 * com **todas as unidades da empresa**, não só as que têm trabalho atribuído.
 *
 * Isto reverte de propósito o escopo apertado da Fase 9. O motivo é o caso de
 * uso que o usuário descreveu: o técnico pode passar um dia só atualizando
 * cadastro, sem OS nenhuma atribuída — e nesse dia uma lista restrita às
 * unidades atribuídas estaria vazia.
 *
 * Não reusa a tela de `/equipamentos` do administrador: aquela é
 * server-rendered (não abre em campo sem rede) e traz inativação e navegação de
 * hierarquia, que não são do técnico. Inativar/excluir continua sendo do admin
 * — a RLS garante, o técnico só tem create/edit.
 */
export function EquipamentosTecnicoView({ initialUnitId }: { initialUnitId?: string }) {
  const [unitFilter, setUnitFilter] = useState(initialUnitId ?? TODAS);
  const [search, setSearch] = useState("");

  const data = useLiveQuery(async () => {
    const [equipment, units, environments, outbox] = await Promise.all([
      offlineDb.equipment.toArray(),
      offlineDb.units.toArray(),
      offlineDb.environments.toArray(),
      offlineDb.outbox.toArray(),
    ]);

    const environmentById = new Map(environments.map((e) => [e.id, e]));
    const unitById = new Map(units.map((u) => [u.id, u]));

    // Estado de sincronização por equipamento: o que ainda não subiu e o que o
    // servidor recusou (tag duplicada é o caso real).
    const syncState = new Map<string, { failed: boolean; error: string | null }>();
    for (const item of outbox) {
      if (item.entityTable !== "equipment") continue;
      syncState.set(item.entityId, {
        failed: item.status === "error",
        error: item.lastError,
      });
    }

    const knownTypes = Array.from(
      new Map(
        equipment
          .map((e) => e.type?.trim())
          .filter((t): t is string => Boolean(t))
          .map((t) => [t.toLowerCase(), t]),
      ).values(),
    ).sort((a, b) => a.localeCompare(b));

    // Unidades com equipamento, mais as que o técnico conhece — assim ele
    // consegue cadastrar o primeiro aparelho de uma unidade ainda vazia.
    const unitOptions = units
      .map((u) => ({ id: u.id, name: u.name, clientName: u.clientName }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      equipment: equipment
        .map((e) => ({
          ...e,
          environmentName: environmentById.get(e.environmentId)?.name ?? "—",
          resolvedUnitName: unitById.get(e.unitId)?.name ?? e.unitName,
        }))
        .sort(
          (a, b) =>
            a.resolvedUnitName.localeCompare(b.resolvedUnitName) ||
            a.tag.localeCompare(b.tag),
        ),
      environments,
      unitOptions,
      knownTypes,
      syncState,
    };
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

  const term = search.trim().toLowerCase();
  const visible = data.equipment.filter((e) => {
    if (unitFilter !== TODAS && e.unitId !== unitFilter) return false;
    if (!term) return true;
    return [e.tag, e.type, e.brand, e.model, e.environmentName]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term));
  });

  const selectedUnitId = unitFilter === TODAS ? null : unitFilter;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground text-sm">
            Toda a planta. Cadastre o que faltar e corrija o que estiver errado —
            funciona sem sinal.
          </p>
        </div>
        {selectedUnitId ? (
          <EquipmentFieldFormDialog
            mode="create"
            unitId={selectedUnitId}
            knownTypes={data.knownTypes}
            environments={data.environments
              .filter((e) => e.unitId === selectedUnitId)
              .map((e) => ({ id: e.id, name: e.name }))}
          />
        ) : (
          // Sem unidade escolhida não dá para saber onde o aparelho fica, e
          // `equipment.unit_id`/`environment_id` são obrigatórios.
          <p className="text-muted-foreground text-sm">
            Escolha uma unidade para cadastrar.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[260px]" aria-label="Filtrar por unidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as unidades</SelectItem>
            {data.unitOptions.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Buscar por tag, marca, sala…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar equipamento"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Nenhum equipamento encontrado.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((eq) => {
            const sync = data.syncState.get(eq.id);
            return (
              <li key={eq.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{eq.tag}</p>
                    <p className="text-muted-foreground truncate">
                      {eq.resolvedUnitName} · {eq.environmentName}
                      {[eq.type, eq.brand, eq.model].filter(Boolean).length
                        ? ` · ${[eq.type, eq.brand, eq.model].filter(Boolean).join(" ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {sync && !sync.failed && (
                      <Badge variant="outline" className="gap-1">
                        <CloudUpload className="size-3" />
                        Na fila
                      </Badge>
                    )}
                    {sync?.failed && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" />
                        Não sincronizou
                      </Badge>
                    )}
                    <EquipmentFieldFormDialog
                      mode="edit"
                      equipment={eq}
                      knownTypes={data.knownTypes}
                    />
                  </div>
                </div>
                {sync?.failed && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-destructive text-xs">{sync.error}</p>
                    <DiscardFailedEquipmentButton equipmentId={eq.id} tag={eq.tag} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Saída para um cadastro que o servidor recusou. Desde a Fase 10 ela deixou de
 * ser a única: com `edit_equipment`, corrigir a tag pelo botão de edição ao lado
 * resolve o caso comum, e descartar serve para quando o cadastro inteiro estava
 * errado.
 */
function DiscardFailedEquipmentButton({
  equipmentId,
  tag,
}: {
  equipmentId: string;
  tag: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await discardFailedEquipmentOffline(equipmentId);
          toast.success(`Cadastro de ${tag} descartado.`);
        })
      }
    >
      <Trash2 className="size-4" />
      Descartar
    </Button>
  );
}
