"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";

export type SyncStatus = "offline" | "online" | "syncing" | "synced" | "error";

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  offline: "Offline",
  online: "Online",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  error: "Erro de sincronização",
};

/**
 * Estado de sync combinando `navigator.onLine` (+ eventos `online`/
 * `offline`) e o tamanho/status da fila do outbox via `useLiveQuery` —
 * fonte de verdade única pro `SyncStatusBadge`. "Online" é o estado
 * transitório antes do primeiro pull terminar; "Sincronizado" é o estado
 * de repouso depois (fila vazia).
 */
export function useSyncStatus(): {
  status: SyncStatus;
  pendingCount: number;
  errorCount: number;
  /** Instante do último pull bem-sucedido (ISO) — exibido ao lado do selo. */
  lastPulledAt: string | null;
} {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const counts = useLiveQuery(
    async () => {
      const all = await offlineDb.outbox.toArray();
      return {
        pending: all.filter((i) => i.status === "pending" || i.status === "syncing").length,
        error: all.filter((i) => i.status === "error").length,
      };
    },
    [],
    { pending: 0, error: 0 },
  );

  const lastPulledAt = useLiveQuery(
    async () => (await offlineDb.meta.get("lastPulledAt"))?.value ?? null,
    [],
    null,
  );
  const hasPulled = Boolean(lastPulledAt);

  let status: SyncStatus;
  if (!isOnline) {
    status = "offline";
  } else if (!hasPulled) {
    status = "online";
  } else if ((counts?.pending ?? 0) > 0) {
    status = "syncing";
  } else if ((counts?.error ?? 0) > 0) {
    status = "error";
  } else {
    status = "synced";
  }

  return {
    status,
    pendingCount: counts?.pending ?? 0,
    errorCount: counts?.error ?? 0,
    lastPulledAt,
  };
}
