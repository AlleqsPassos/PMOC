"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChecklistItemRow } from "@/features/maintenance/components/checklist-item-row";
import {
  addAdhocChecklistItem,
  applyChecklistTemplate,
  type MaintenanceFormState,
} from "@/features/maintenance/actions";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";
import type { ChecklistItemRow as ChecklistItemRowData } from "@/features/maintenance/queries";

export function ChecklistSection({
  workOrderId,
  recordId,
  items,
  templates,
}: {
  workOrderId: string;
  recordId: string;
  items: ChecklistItemRowData[];
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [isApplying, startApplying] = useTransition();

  function handleApply() {
    if (!templateId) return;
    startApplying(async () => {
      const result = await applyChecklistTemplate(recordId, workOrderId, templateId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const adhocFormRef = useRef<HTMLFormElement>(null);
  const adhocAction = addAdhocChecklistItem.bind(null, recordId, workOrderId);
  const [adhocState, adhocFormAction, adhocPending] = useActionState<
    MaintenanceFormState,
    FormData
  >(adhocAction, undefined);
  useCloseOnSuccess(adhocState, () => adhocFormRef.current?.reset());

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <div className="flex items-end gap-2">
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Aplicar um template de checklist" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleApply} disabled={!templateId || isApplying}>
            {isApplying ? "Aplicando…" : "Aplicar"}
          </Button>
        </div>
      )}

      {items.map((item) => (
        <ChecklistItemRow
          key={item.id}
          itemId={item.id}
          workOrderId={workOrderId}
          recordId={recordId}
          label={item.labelSnapshot}
          status={item.status}
          isAdhoc={item.isAdhoc}
        />
      ))}

      <form ref={adhocFormRef} action={adhocFormAction} className="flex items-end gap-2">
        <Input name="label" placeholder="Adicionar item avulso (ex: outro achado)" />
        <Button type="submit" variant="outline" disabled={adhocPending}>
          {adhocPending ? "Adicionando…" : "Adicionar"}
        </Button>
      </form>
      {adhocState?.error && <p className="text-destructive text-sm">{adhocState.error}</p>}
    </div>
  );
}
