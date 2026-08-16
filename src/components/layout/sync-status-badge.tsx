"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyncStatus, SYNC_STATUS_LABELS, type SyncStatus } from "@/lib/offline/sync-store";
import { drainThenPull, setupSyncTriggers } from "@/lib/offline/sync-engine";

// Nenhuma store externa de verdade pra assinar — só usa useSyncExternalStore
// pelo par de snapshots (server sempre `false`, cliente sempre `true`), o
// jeito sancionado pelo React de saber "já montei no cliente" sem cair em
// setState síncrono dentro de efeito (proibido pelo lint deste projeto,
// mesmo motivo do padrão em use-close-on-success.ts).
const subscribeNoop = () => () => {};

const DOT_CLASS: Record<SyncStatus, string> = {
  offline: "bg-muted-foreground",
  online: "bg-emerald-500",
  syncing: "bg-amber-500 animate-pulse",
  synced: "bg-emerald-500",
  error: "bg-destructive",
};

/**
 * Estado real de sync (Fase 6) — substitui o placeholder estático "Online"
 * das Fases 1-5. Também é quem liga os gatilhos do motor de sync
 * (`setupSyncTriggers`) e dispara o pull inicial: um só client component,
 * montado uma vez no topbar de `(app)/layout.tsx`, evita duplicar a
 * inicialização em cada página.
 */
export function SyncStatusBadge() {
  // `navigator.onLine`/IndexedDB não existem no servidor — qualquer estado
  // derivado deles teria que divergir entre o HTML gerado no SSR e o
  // primeiro paint no cliente. Em vez de arriscar mismatch, o primeiro
  // render (servidor + primeiro paint do cliente, antes de qualquer efeito
  // rodar) é sempre o mesmo placeholder estático; o estado real só aparece
  // depois de montar — mesmo padrão recomendado pra qualquer client
  // component que lê API só-de-browser.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const { status, pendingCount, errorCount } = useSyncStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void drainThenPull();
    return setupSyncTriggers();
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    await drainThenPull();
    setIsRefreshing(false);
  }

  if (!mounted) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1.5 font-normal">
        <span className="bg-muted-foreground size-1.5 rounded-full" />
        …
      </Badge>
    );
  }

  const label =
    status === "syncing" && pendingCount > 0
      ? `${SYNC_STATUS_LABELS[status]} (${pendingCount})`
      : status === "error"
        ? `${SYNC_STATUS_LABELS[status]} (${errorCount})`
        : SYNC_STATUS_LABELS[status];

  return (
    <div className="flex items-center gap-1">
      <Badge
        variant="outline"
        className="text-muted-foreground gap-1.5 font-normal"
        title={
          status === "offline"
            ? "Sem conexão — mudanças ficam salvas localmente e sincronizam ao reconectar."
            : undefined
        }
      >
        <span className={`size-1.5 rounded-full ${DOT_CLASS[status]}`} />
        {label}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleRefresh}
        disabled={isRefreshing || status === "offline"}
        title="Atualizar dados offline agora"
      >
        <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
