import { Badge } from "@/components/ui/badge";

/**
 * Placeholder estático. Estados reais (Online/Offline/Sincronizando/
 * Sincronizado/Erro de sincronização), orientados pelo outbox Dexie, só
 * existem a partir da Fase 6 — ver seção 12/13 do documento de arquitetura.
 */
export function SyncStatusBadge() {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground gap-1.5 font-normal"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Online
    </Badge>
  );
}
