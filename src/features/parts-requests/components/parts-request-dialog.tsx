"use client";

import { useState, useTransition } from "react";
import { Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPartsRequestOffline } from "@/features/parts-requests/offline-actions";
import { PartsCatalogPicker } from "@/features/parts-requests/components/parts-catalog-picker";

/**
 * Solicitar peça virou **botão + diálogo** (Fase 11), no lugar do formulário
 * sempre aberto dentro do atendimento. Pedido do usuário, olhando a tela do
 * celular: três campos abertos ocupavam a altura toda entre as fotos e o laudo,
 * mesmo nas corretivas em que nenhuma peça é necessária — que são a maioria. O
 * que fica visível agora é a lista do que já foi pedido.
 *
 * Aceita ser aberto de fora (`open`/`onOpenChange`) porque a tela de conclusão
 * precisa trazer o técnico para cá quando ele escolhe "aguardando peça" sem ter
 * dito qual peça falta.
 */
export function PartsRequestDialog({
  workOrderId,
  maintenanceRecordId,
  open,
  onOpenChange,
  disabled,
  disabledReason,
}: {
  workOrderId: string;
  maintenanceRecordId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = partName.trim();
    if (!name) return;

    startTransition(async () => {
      await createPartsRequestOffline({
        workOrderId,
        maintenanceRecordId,
        partName: name,
        quantity: Number(quantity) || 1,
        note: note.trim() || null,
      });
      setPartName("");
      setQuantity("1");
      setNote("");
      onOpenChange(false);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full sm:w-fit" disabled={disabled}>
            <Package className="size-4" />
            Solicitar peça
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Solicitar peça</DialogTitle>
              <DialogDescription>
                Escolha no catálogo ou digite, se não estiver na lista. O
                administrador recebe a solicitação junto com este atendimento.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <Label htmlFor="partName">Peça</Label>
                <PartsCatalogPicker id="partName" value={partName} onChange={setPartName} />
              </div>
              <div className="flex w-20 flex-col gap-1.5">
                <Label htmlFor="quantity">Qtd.</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partNote">Observação (opcional)</Label>
              <Textarea
                id="partNote"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending || !partName.trim()}>
                {isPending ? "Enviando…" : "Solicitar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {disabled && disabledReason && (
        <p className="text-muted-foreground text-xs">{disabledReason}</p>
      )}
    </div>
  );
}
