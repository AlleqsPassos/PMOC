"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTicketFromEquipmentOffline } from "@/features/tickets/offline-actions";
import { createPartsRequestOffline } from "@/features/parts-requests/offline-actions";
import { PartsCatalogPicker } from "@/features/parts-requests/components/parts-catalog-picker";
import { AttachmentUploader } from "@/features/attachments/components/attachment-uploader";
import {
  TICKET_PRIORITY,
  TICKET_PRIORITY_LABELS,
  type TicketPriority,
} from "@/features/tickets/schema";

/**
 * Impedimento — o equipamento não pôde ser atendido, e o técnico registra isso
 * ali mesmo, sem sair da sala.
 *
 * Fase 16 — a primeira pergunta é o **motivo**, porque as duas situações não
 * pedem o mesmo formulário:
 *
 *  - **Ar não funciona** é defeito do aparelho: abre a corretiva de verdade, com
 *    descrição, prioridade, fotos do problema e peça, que é o que o
 *    administrador precisa para programar o conserto.
 *  - **Outros** é impedimento de circunstância (sala ocupada, acesso trancado,
 *    força maior). Aí não há defeito a fotografar nem peça a pedir — só o motivo
 *    escrito, para o administrador saber por que aquela sala ficou pendente.
 *
 * Nos dois casos nasce um chamado: é o registro durável que faz o aparelho
 * aparecer na fila do administrador e sair da rotina da preventiva. As fotos e a
 * peça penduram no `maintenance_record` **atual** — `attachments.work_order_id`
 * é NOT NULL e o chamado recém-aberto ainda não tem OS, e registrar o defeito na
 * OS onde ele foi encontrado é o histórico correto do equipamento.
 *
 * As fotos aparecem já no diálogo porque são gravadas na hora (blob local +
 * fila), não no submit — fechar sem confirmar deixaria as fotos e nenhum
 * chamado, então o texto avisa que a foto já valeu.
 */

const MOTIVO_DEFEITO = "ar_nao_funciona";

export function ImpedimentoDialog({
  companyId,
  workOrderId,
  maintenanceRecordId,
  equipmentId,
  equipmentTag,
}: {
  companyId: string;
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  equipmentTag: string;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isPending, startTransition] = useTransition();

  const isDefeito = motivo === MOTIVO_DEFEITO;

  const problemPhotos = useLiveQuery(
    () =>
      offlineDb.attachments
        .where("maintenanceRecordId")
        .equals(maintenanceRecordId)
        .filter((a) => a.category === "problema")
        .toArray(),
    [maintenanceRecordId],
  );

  function reset() {
    setMotivo("");
    setPartName("");
    setQuantity("1");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!motivo) return;

    const formData = new FormData(e.currentTarget);
    const texto = String(formData.get("description") ?? "").trim();
    if (!texto) return;

    const priority = isDefeito
      ? (String(formData.get("priority") ?? "alta") as TicketPriority)
      : ("media" as TicketPriority);
    const description = isDefeito ? `Ar não funciona. ${texto}` : texto;
    const part = isDefeito ? partName.trim() : "";

    startTransition(async () => {
      const result = await createTicketFromEquipmentOffline({
        equipmentId,
        title: `Impedimento em ${equipmentTag}`,
        description,
        priority,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (part) {
        await createPartsRequestOffline({
          workOrderId,
          maintenanceRecordId,
          partName: part,
          quantity: Number(quantity) || 1,
          note: `Impedimento em ${equipmentTag}`,
        });
      }

      toast.success(
        part ? "Impedimento aberto e peça solicitada." : "Impedimento registrado.",
      );
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <TriangleAlert className="size-4" />
          Abrir impedimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Impedimento em {equipmentTag}</DialogTitle>
            <DialogDescription>
              Por que este equipamento não pôde ser atendido?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motivo">Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger className="w-full" id="motivo">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MOTIVO_DEFEITO}>Ar não funciona</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {motivo && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">
                {isDefeito ? "O que está acontecendo" : "Qual o motivo"}
              </Label>
              <Textarea id="description" name="description" rows={3} required />
            </div>
          )}

          {isDefeito && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Prioridade</Label>
                <Select name="priority" defaultValue="alta">
                  <SelectTrigger className="w-full" id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITY.map((p) => (
                      <SelectItem key={p} value={p}>
                        {TICKET_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Fotos do problema</span>
                <AttachmentUploader
                  companyId={companyId}
                  workOrderId={workOrderId}
                  maintenanceRecordId={maintenanceRecordId}
                  equipmentId={equipmentId}
                  category="problema"
                  existing={problemPhotos ?? []}
                />
                <p className="text-muted-foreground text-xs">
                  As fotos são salvas na hora, junto ao atendimento deste
                  equipamento.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                  <Label htmlFor="impedimentoPart">Peça (opcional)</Label>
                  <PartsCatalogPicker
                    id="impedimentoPart"
                    value={partName}
                    onChange={setPartName}
                  />
                </div>
                <div className="flex w-20 flex-col gap-1.5">
                  <Label htmlFor="impedimentoQty">Qtd.</Label>
                  <Input
                    id="impedimentoQty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending || !motivo}>
              {isPending
                ? "Registrando…"
                : isDefeito
                  ? "Abrir corretiva"
                  : "Registrar impedimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
