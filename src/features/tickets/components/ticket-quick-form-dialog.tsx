"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
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
import { TICKET_PRIORITY, TICKET_PRIORITY_LABELS, type TicketPriority } from "@/features/tickets/schema";

/**
 * Fase 6 — versão offline-first do antigo `TicketFormDialog mode="quick"`.
 * Chamado ad-hoc do técnico a partir do equipamento: grava local + enfileira
 * (ver features/tickets/offline-actions.ts), funciona sem rede depois do
 * primeiro pull.
 */
export function TicketQuickFormDialog({
  equipmentId,
  locationLabel,
}: {
  equipmentId: string;
  locationLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const description = String(formData.get("description") ?? "").trim() || null;
    const priority = String(formData.get("priority") ?? "media") as TicketPriority;

    startTransition(async () => {
      const result = await createTicketFromEquipmentOffline({
        equipmentId,
        title,
        description,
        priority,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquarePlus className="size-4" />
          Abrir chamado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Abrir chamado</DialogTitle>
            <DialogDescription>Chamado vinculado a {locationLabel}.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priority">Prioridade</Label>
            <Select name="priority" defaultValue="media">
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

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Abrir chamado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
