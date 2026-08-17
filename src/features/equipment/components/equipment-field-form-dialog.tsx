"use client";

import { useId, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
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
  updateEquipmentOffline,
} from "@/features/equipment/offline-actions";

const NEW_ENVIRONMENT = "__new__";

type Props = {
  /** Tipos já usados no cadastro — alimentam o datalist. */
  knownTypes: string[];
} & (
  | { mode: "create"; unitId: string; environments: { id: string; name: string }[] }
  | {
      mode: "edit";
      equipment: {
        id: string;
        tag: string;
        type: string | null;
        brand: string | null;
        model: string | null;
      };
    }
);

/**
 * Cadastro e correção de equipamento em campo — offline-first, no mesmo padrão
 * do chamado ad-hoc (`TicketQuickFormDialog`): grava local + enfileira.
 *
 * O seletor de ambiente traz uma opção "Nova sala", porque
 * `equipment.environment_id` é NOT NULL e o caso que motiva a tela é achar um
 * aparelho num lugar que ninguém cadastrou. Quando ela é usada, o ambiente é
 * criado primeiro e o equipamento referencia o id novo — a ordem do outbox
 * garante que a FK chegue satisfeita no servidor.
 *
 * O modo de edição chegou na Fase 10, junto com a permissão `edit_equipment`
 * para o técnico. O tipo é oferecido por `datalist` com os valores que já
 * existem no cadastro: ele é texto livre no schema, mas é o que casa o
 * equipamento com o checklist da preventiva — "Split" e "split " deixariam o
 * aparelho sem checklist, sem nenhum aviso.
 */
export function EquipmentFieldFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const typeListId = useId();

  const environments = props.mode === "create" ? props.environments : [];
  const [environmentId, setEnvironmentId] = useState(
    environments[0]?.id ?? NEW_ENVIRONMENT,
  );

  const creatingEnvironment = props.mode === "create" && environmentId === NEW_ENVIRONMENT;
  const defaults = props.mode === "edit" ? props.equipment : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tag = String(formData.get("tag") ?? "").trim();
    if (!tag) return;

    const type = String(formData.get("type") ?? "").trim() || null;
    const brand = String(formData.get("brand") ?? "").trim() || null;
    const model = String(formData.get("model") ?? "").trim() || null;

    if (props.mode === "edit") {
      startTransition(async () => {
        const result = await updateEquipmentOffline({
          id: props.equipment.id,
          tag,
          type,
          brand,
          model,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Cadastro atualizado.");
        setOpen(false);
      });
      return;
    }

    const newEnvironmentName = String(formData.get("environmentName") ?? "").trim();
    if (creatingEnvironment && !newEnvironmentName) {
      toast.error("Informe o nome da sala.");
      return;
    }

    const { unitId } = props;
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
        type,
        brand,
        model,
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
        {props.mode === "create" ? (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Novo equipamento
          </Button>
        ) : (
          <Button size="sm" variant="ghost" aria-label={`Editar ${props.equipment.tag}`}>
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? "Novo equipamento" : "Editar equipamento"}
            </DialogTitle>
            <DialogDescription>
              {props.mode === "create"
                ? "Para um aparelho que você encontrou e não estava cadastrado. Funciona sem sinal — sobe quando a conexão voltar."
                : "Corrija os dados do aparelho. Funciona sem sinal — sobe quando a conexão voltar."}
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
              defaultValue={defaults?.tag ?? ""}
            />
          </div>

          {props.mode === "create" && (
            <>
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
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-type">Tipo</Label>
              <Input
                id="field-type"
                name="type"
                list={typeListId}
                placeholder="Ex.: Split"
                defaultValue={defaults?.type ?? ""}
              />
              <datalist id={typeListId}>
                {props.knownTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-brand">Marca (opcional)</Label>
              <Input id="field-brand" name="brand" defaultValue={defaults?.brand ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-model">Modelo (opcional)</Label>
            <Input id="field-model" name="model" defaultValue={defaults?.model ?? ""} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : props.mode === "create" ? "Cadastrar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
