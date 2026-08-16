"use client";

import { useActionState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  addChecklistTemplateItem,
  type ChecklistItemFormState,
} from "@/features/checklist-templates/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

/** Form pequeno de "adicionar item" — sem dialog, fica embutido na lista. */
export function ChecklistTemplateItemForm({ templateId }: { templateId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = addChecklistTemplateItem.bind(null, templateId);
  const [state, formAction, pending] = useActionState<ChecklistItemFormState, FormData>(
    action,
    undefined,
  );

  // Reaproveita o hook de "ajustar durante a renderização" (mesmo padrão de
  // fechar dialogs) pra resetar o form só quando o estado realmente muda.
  useCloseOnSuccess(state, () => formRef.current?.reset());

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-md border p-3"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="label">Novo item</Label>
        <Input id="label" name="label" placeholder="ex: Verificar filtro de ar" required />
        {state?.fieldErrors?.label && (
          <p className="text-destructive text-sm">{state.fieldErrors.label[0]}</p>
        )}
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <Checkbox name="isRequired" defaultChecked />
        Obrigatório
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <Checkbox name="allowsOther" />
        Permite &quot;outro&quot;
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adicionando…" : "Adicionar"}
      </Button>
      {state?.error && <p className="text-destructive w-full text-sm">{state.error}</p>}
    </form>
  );
}
