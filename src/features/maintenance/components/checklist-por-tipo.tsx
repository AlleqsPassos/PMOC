"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { setGroupChecklistItemOffline } from "@/features/maintenance/offline-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ChecklistGroup = {
  equipmentType: string;
  templateName: string | null;
  recordIds: string[];
  items: { id: string; label: string; checked: boolean }[];
};

/**
 * O checklist do fim da preventiva, uma lista por **tipo de equipamento**
 * (Fase 10) — split tem uma lista, chiller tem outra, como o usuário descreveu.
 *
 * Um toque marca o item em **todos** os equipamentos daquele tipo no ambiente:
 * o schema guarda a resposta por equipamento (e tem que continuar guardando,
 * senão o PMOC sairia com o checklist de um aparelho só), mas obrigar o técnico
 * a marcar a mesma coisa cinco vezes não descreve o trabalho dele.
 *
 * Tipo sem template casado aparece dito com todas as letras, não some em
 * silêncio — quem lê a tela precisa saber que falta o admin cadastrar a lista
 * daquela categoria.
 */
export function ChecklistPorTipo({
  groups,
  disabled,
  onChanged,
}: {
  groups: ChecklistGroup[];
  disabled?: boolean;
  /** Avisa a tela que algo foi alterado — base do botão "Salvar alterações". */
  onChanged?: () => void;
}) {
  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Checklist</CardTitle>
        <CardDescription>
          O que foi feito nos equipamentos deste ambiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.equipmentType} className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {group.equipmentType}
              <span className="text-muted-foreground font-normal">
                {" "}
                · {group.recordIds.length} equipamento
                {group.recordIds.length > 1 ? "s" : ""}
              </span>
            </p>

            {group.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {group.templateName
                  ? "Este template ainda não tem itens cadastrados."
                  : "Nenhum template de checklist cadastrado para este tipo de equipamento. Peça ao administrador para criar em Configurações → Templates de checklist."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    recordIds={group.recordIds}
                    disabled={disabled}
                    onChanged={onChanged}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChecklistRow({
  item,
  recordIds,
  disabled,
  onChanged,
}: {
  item: { id: string; label: string; checked: boolean };
  recordIds: string[];
  disabled?: boolean;
  onChanged?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-start gap-2">
      <Checkbox
        id={`chk-${item.id}`}
        checked={item.checked}
        disabled={disabled || isPending}
        onCheckedChange={(checked) => {
          onChanged?.();
          return startTransition(() =>
            setGroupChecklistItemOffline({
              recordIds,
              templateItemId: item.id,
              label: item.label,
              checked: checked === true,
            }),
          );
        }}
      />
      <label htmlFor={`chk-${item.id}`} className="text-sm leading-5">
        {item.label}
      </label>
    </li>
  );
}
