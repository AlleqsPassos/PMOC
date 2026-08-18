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
 * Impedimento — o equipamento tem um problema que a preventiva não resolve, e o
 * técnico abre a corretiva ali mesmo, sem sair da sala.
 *
 * Cria até três coisas, todas offline e **sem schema novo**:
 *  - o chamado (corretiva), pelo caminho que já existia desde a Fase 6;
 *  - as fotos do defeito, penduradas no `maintenance_record` **atual**. Não é um
 *    contorno: `attachments.work_order_id` é NOT NULL e o chamado recém-aberto
 *    ainda não tem OS, e registrar o defeito na OS onde ele foi encontrado é o
 *    histórico correto do equipamento;
 *  - a solicitação de peça na OS atual, pelo mesmo motivo.
 *
 * As fotos aparecem já no diálogo porque elas são gravadas na hora (blob local +
 * fila), não no submit — fechar sem confirmar deixaria as fotos e nenhum
 * chamado, então o texto avisa que a foto já valeu.
 */
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
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isPending, startTransition] = useTransition();

  const problemPhotos = useLiveQuery(
    () =>
      offlineDb.attachments
        .where("maintenanceRecordId")
        .equals(maintenanceRecordId)
        .filter((a) => a.category === "problema")
        .toArray(),
    [maintenanceRecordId],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = String(formData.get("description") ?? "").trim();
    if (!description) return;
    const priority = String(formData.get("priority") ?? "alta") as TicketPriority;
    const part = partName.trim();

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
        part
          ? "Corretiva aberta e peça solicitada."
          : "Corretiva aberta para este equipamento.",
      );
      setPartName("");
      setQuantity("1");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <TriangleAlert className="size-4" />
          Abrir impedimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Impedimento em {equipmentTag}</DialogTitle>
            <DialogDescription>
              Abre uma corretiva para este equipamento. Descreva o que está
              acontecendo e, se souber, já peça a peça.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">O que está acontecendo</Label>
            <Textarea id="description" name="description" rows={3} required />
          </div>

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
              As fotos são salvas na hora, junto ao atendimento deste equipamento.
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

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Abrindo…" : "Abrir corretiva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
