"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import {
  createEnvironmentOffline,
  createEquipmentOffline,
} from "@/features/equipment/offline-actions";

const NEW_ENVIRONMENT = "__new__";

/**
 * Cadastro de equipamento em campo (Fase 9) — offline-first, no mesmo padrão
 * do chamado ad-hoc (`TicketQuickFormDialog`): grava local + enfileira.
 *
 * O seletor de ambiente traz uma opção "Nova sala", porque
 * `equipment.environment_id` é NOT NULL e o caso que motiva a tela é achar um
 * aparelho num lugar que ninguém cadastrou. Quando ela é usada, o ambiente é
 * criado primeiro e o equipamento referencia o id novo — a ordem do outbox
 * garante que a FK chegue satisfeita no servidor.
 */
export function EquipmentFieldFormDialog({
  unitId,
  environments,
}: {
  unitId: string;
  environments: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [environmentId, setEnvironmentId] = useState(
    environments[0]?.id ?? NEW_ENVIRONMENT,
  );
  const [isPending, startTransition] = useTransition();

  const creatingEnvironment = environmentId === NEW_ENVIRONMENT;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tag = String(formData.get("tag") ?? "").trim();
    if (!tag) return;

    const newEnvironmentName = String(formData.get("environmentName") ?? "").trim();
    if (creatingEnvironment && !newEnvironmentName) {
      toast.error("Informe o nome da sala.");
      return;
    }

    startTransition(async () => {
      let targetEnvironmentId = environmentId;

      if (creatingEnvironment) {
        const created = await createEnvironmentOffline({
          unitId,
          name: newEnvironmentName,
        });
        if (created.error || !created.id) {
          toast.error(created.error ?? "Não foi possível criar a sala.");
          return;
        }
        targetEnvironmentId = created.id;
      }

      const result = await createEquipmentOffline({
        unitId,
        environmentId: targetEnvironmentId,
        tag,
        type: String(formData.get("type") ?? "").trim() || null,
        brand: String(formData.get("brand") ?? "").trim() || null,
        model: String(formData.get("model") ?? "").trim() || null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Equipamento cadastrado. Sobe na próxima sincronização.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4" />
          Novo equipamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Novo equipamento</DialogTitle>
            <DialogDescription>
              Para um aparelho que você encontrou e não estava cadastrado.
              Funciona sem sinal — sobe quando a conexão voltar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-tag">Tag</Label>
            <Input
              id="field-tag"
              name="tag"
              required
              autoComplete="off"
              placeholder="Ex.: AC-014"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-environment">Onde está instalado</Label>
            <Select value={environmentId} onValueChange={setEnvironmentId}>
              <SelectTrigger id="field-environment" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_ENVIRONMENT}>+ Nova sala…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {creatingEnvironment && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-environment-name">Nome da sala</Label>
              <Input
                id="field-environment-name"
                name="environmentName"
                required
                placeholder="Ex.: Sala de exames 3"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-type">Tipo (opcional)</Label>
              <Input id="field-type" name="type" placeholder="Ex.: Split" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-brand">Marca (opcional)</Label>
              <Input id="field-brand" name="brand" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-model">Modelo (opcional)</Label>
            <Input id="field-model" name="model" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
