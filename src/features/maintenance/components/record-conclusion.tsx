"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeMaintenanceRecordOffline } from "@/features/maintenance/offline-actions";
import {
  MAINTENANCE_RESOLUTION,
  MAINTENANCE_RESOLUTION_LABELS,
  type MaintenanceResolution,
} from "@/features/maintenance/schema";
import {
  ATTACHMENT_CATEGORY_LABELS,
  type AttachmentCategory,
} from "@/features/attachments/schema";

/**
 * Fecha o atendimento de um equipamento, dizendo **como** terminou (Fase 10).
 *
 * As fotos obrigatórias que faltam aparecem como aviso e não travam o botão —
 * decisão explícita do usuário. Trancar a conclusão numa câmera que não abriu
 * deixaria o técnico sem saída em campo; o administrador vê a pendência e cobra.
 */
export function RecordConclusion({
  recordId,
  missingPhotos,
  backHref,
}: {
  recordId: string;
  missingPhotos: AttachmentCategory[];
  backHref: string;
}) {
  const [resolution, setResolution] = useState<MaintenanceResolution | "">("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      {missingPhotos.length > 0 && (
        <p className="text-destructive flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Falta a foto de{" "}
            {missingPhotos.map((c) => ATTACHMENT_CATEGORY_LABELS[c].toLowerCase()).join(" e ")}.
            Você pode concluir assim, mas o atendimento fica marcado como
            incompleto.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <Label htmlFor="resolution">Como este atendimento termina?</Label>
          <Select
            value={resolution}
            onValueChange={(v) => setResolution(v as MaintenanceResolution)}
          >
            <SelectTrigger className="w-full" id="resolution">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {MAINTENANCE_RESOLUTION.map((r) => (
                <SelectItem key={r} value={r}>
                  {MAINTENANCE_RESOLUTION_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          disabled={isPending || !resolution}
          onClick={() =>
            startTransition(async () => {
              if (!resolution) return;
              await completeMaintenanceRecordOffline(recordId, resolution);
              router.push(backHref);
            })
          }
        >
          <CircleCheck className="size-4" />
          {isPending ? "Concluindo…" : "Concluir atendimento"}
        </Button>
      </div>
    </div>
  );
}
