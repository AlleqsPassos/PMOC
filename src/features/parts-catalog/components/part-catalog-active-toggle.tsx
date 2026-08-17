"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setPartCatalogItemActive } from "@/features/parts-catalog/actions";

/**
 * Ativa/desativa a peça na hora, sem diálogo — mesmo padrão de salvamento
 * imediato por linha já usado em `EquipmentStatusSelect` e nos overrides de
 * permissão (Fase 7).
 */
export function PartCatalogActiveToggle({
  partId,
  isActive,
}: {
  partId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => setPartCatalogItemActive(partId, !isActive))}
    >
      {isPending ? "…" : isActive ? "Desativar" : "Reativar"}
    </Button>
  );
}
