"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { generatePmoc, type PmocFormState } from "@/features/pmoc/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

type ClientOption = { id: string; corporateName: string };

export function GeneratePmocDialog({ clientOptions }: { clientOptions: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<PmocFormState, FormData>(
    generatePmoc,
    undefined,
  );

  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Novo PMOC
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Gerar PMOC</DialogTitle>
            <DialogDescription>
              Consolida todas as ordens de serviço concluídas do cliente, em todas as
              unidades, dentro do período selecionado, num único PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientId">Cliente</Label>
              <Select name="clientId" required>
                <SelectTrigger className="w-full" id="clientId">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.corporateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.fieldErrors?.clientId && (
                <p className="text-destructive text-sm">{state.fieldErrors.clientId[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="periodStart">Início do período</Label>
                <Input id="periodStart" name="periodStart" type="date" required />
                {state?.fieldErrors?.periodStart && (
                  <p className="text-destructive text-sm">{state.fieldErrors.periodStart[0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="periodEnd">Fim do período</Label>
                <Input id="periodEnd" name="periodEnd" type="date" required />
                {state?.fieldErrors?.periodEnd && (
                  <p className="text-destructive text-sm">{state.fieldErrors.periodEnd[0]}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                name="title"
                placeholder="Padrão: PMOC — Cliente — período"
              />
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Gerando PDF…" : "Gerar PMOC"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
