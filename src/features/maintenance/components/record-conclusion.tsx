"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
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
 * Fase 11 mudou três coisas, todas por decisão do usuário depois de usar a tela
 * no celular:
 *
 * 1. **Foto obrigatória agora trava.** Na Fase 10 ela só avisava, com o
 *    argumento de não deixar o técnico preso em campo por uma câmera que não
 *    abriu. Na prática o aviso foi ignorado e chegaram atendimentos sem a foto
 *    do equipamento e da etiqueta — que são justamente o que prova, no PMOC, que
 *    o aparelho certo foi atendido. Vale para concluir **e** para pedir peça.
 * 2. **Peça solicitada decide o desfecho.** Se ele pediu peça, perguntar como
 *    terminou é perguntar o que já se sabe: trava em "aguardando peça".
 * 3. **O caminho contrário também é fechado.** Escolher "aguardando peça" sem
 *    ter pedido nada leva de volta à seção de peças, porque um impedimento sem
 *    peça nomeada não dá ao administrador nada com que trabalhar.
 */
export function RecordConclusion({
  recordId,
  missingPhotos,
  hasParts,
  alreadyDone,
  currentResolution,
  backHref,
  onNeedPart,
}: {
  recordId: string;
  missingPhotos: AttachmentCategory[];
  hasParts: boolean;
  alreadyDone: boolean;
  currentResolution: MaintenanceResolution | null;
  backHref: string;
  onNeedPart: () => void;
}) {
  // Já concluído volta a perguntar: é assim que ele registra que a peça chegou
  // e o equipamento voltou a funcionar, sem depender do administrador.
  const askResolution = alreadyDone || !hasParts;
  const [resolution, setResolution] = useState<MaintenanceResolution | "">(
    currentResolution ?? "",
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const effective: MaintenanceResolution | "" = askResolution ? resolution : "aguardando_peca";
  const missingPart = effective === "aguardando_peca" && !hasParts;
  const blockedByPhotos = missingPhotos.length > 0;
  const canSubmit = Boolean(effective) && !blockedByPhotos && !missingPart && !isPending;

  function handleResolutionChange(value: string) {
    const next = value as MaintenanceResolution;
    setResolution(next);
    // Levar até a seção de peças na hora da escolha, não só no toque do botão:
    // no celular a seção fica fora da tela, e um aviso sobre algo que ele não
    // está vendo não ajuda.
    if (next === "aguardando_peca" && !hasParts) onNeedPart();
  }

  return (
    <div className="flex flex-col gap-3">
      {blockedByPhotos && (
        <p className="text-destructive flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Falta a foto de{" "}
            {missingPhotos.map((c) => ATTACHMENT_CATEGORY_LABELS[c].toLowerCase()).join(" e ")}.
            Sem ela não dá para concluir nem solicitar peça.
          </span>
        </p>
      )}

      {!askResolution && (
        <p className="text-muted-foreground text-sm">
          Você solicitou peça neste atendimento — ele será concluído como{" "}
          <span className="font-medium">
            {MAINTENANCE_RESOLUTION_LABELS.aguardando_peca}
          </span>
          .
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {askResolution && (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <Label htmlFor="resolution">Como este atendimento termina?</Label>
            <Select value={resolution} onValueChange={handleResolutionChange}>
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
        )}

        <Button
          disabled={!canSubmit}
          onClick={() =>
            startTransition(async () => {
              if (!effective) return;
              await completeMaintenanceRecordOffline(recordId, effective);
              if (alreadyDone) {
                toast.success("Desfecho atualizado.");
                return;
              }
              router.push(backHref);
            })
          }
        >
          <CircleCheck className="size-4" />
          {isPending
            ? "Salvando…"
            : alreadyDone
              ? "Atualizar desfecho"
              : "Concluir atendimento"}
        </Button>
      </div>

      {missingPart && (
        <p className="text-destructive text-sm">
          Diga qual peça está faltando em <span className="font-medium">Peças</span>,
          logo acima — sem isso o administrador não tem o que providenciar.
        </p>
      )}
    </div>
  );
}
