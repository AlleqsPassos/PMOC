"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createPartCatalogItem,
  type PartCatalogFormState,
} from "@/features/parts-catalog/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

export function PartCatalogFormDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<PartCatalogFormState, FormData>(
    createPartCatalogItem,
    undefined,
  );

  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nova peça
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Nova peça</DialogTitle>
            <DialogDescription>
              Entra na lista que o técnico vê em campo, junto com as peças
              padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="ex: Capacitor 35uF" required />
            {state?.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unidade (opcional)</Label>
            <Input id="unit" name="unit" placeholder="un, kg, m, l…" />
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Cadastrar peça"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
