"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setUserPermissionOverride } from "@/features/permissions/actions";
import { OVERRIDE_MODES, OVERRIDE_MODE_LABELS, type OverrideMode } from "@/features/permissions/schema";

/** Salvamento imediato por linha — mesmo padrão de EquipmentStatusSelect (sem form/dialog). */
export function PermissionOverrideRow({
  userId,
  permissionId,
  permissionKey,
  permissionLabel,
  roleDefaultAllows,
  initialMode,
}: {
  userId: string;
  permissionId: string;
  permissionKey: string;
  permissionLabel: string;
  roleDefaultAllows: boolean;
  initialMode: OverrideMode;
}) {
  const [mode, setMode] = useState<OverrideMode>(initialMode);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string) {
    const nextMode = next as OverrideMode;
    setMode(nextMode);
    setError(null);
    startTransition(async () => {
      const result = await setUserPermissionOverride(userId, permissionId, permissionKey, nextMode);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="text-sm">
        <p>{permissionLabel}</p>
        <p className="text-muted-foreground text-xs">
          Padrão do papel: {roleDefaultAllows ? "permite" : "não permite"}
        </p>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
      <Select value={mode} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger size="sm" className="w-[170px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OVERRIDE_MODES.map((m) => (
            <SelectItem key={m} value={m}>
              {OVERRIDE_MODE_LABELS[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
