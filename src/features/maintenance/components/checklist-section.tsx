"use client";

import { useRef, useState, useTransition } from "react";
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
  addAdhocChecklistItemOffline,
  applyChecklistTemplateOffline,
} from "@/features/maintenance/offline-actions";
import type { OfflineChecklistItem, OfflineChecklistTemplate } from "@/lib/offline/db";

export function ChecklistSection({
  recordId,
  items,
  templates,
}: {
  recordId: string;
  items: OfflineChecklistItem[];
  templates: OfflineChecklistTemplate[];
}) {
  const [templateId, setTemplateId] = useState("");
  const [isApplying, startApplying] = useTransition();
  const [isAdding, startAdding] = useTransition();
  const adhocInputRef = useRef<HTMLInputElement>(null);

  function handleApply() {
    if (!templateId) return;
    startApplying(async () => {
      const result = await applyChecklistTemplateOffline(recordId, templateId);
      if (result.error) toast.error(result.error);
    });
  }

  function handleAddAdhoc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const label = adhocInputRef.current?.value.trim();
    if (!label) return;
    startAdding(async () => {
      await addAdhocChecklistItemOffline(recordId, label);
      if (adhocInputRef.current) adhocInputRef.current.value = "";
    });
  }

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
          label={item.labelSnapshot}
          status={item.status}
          isAdhoc={item.templateItemId === null}
        />
      ))}

      <form onSubmit={handleAddAdhoc} className="flex items-end gap-2">
        <Input ref={adhocInputRef} name="label" placeholder="Adicionar item avulso (ex: outro achado)" />
        <Button type="submit" variant="outline" disabled={isAdding}>
          {isAdding ? "Adicionando…" : "Adicionar"}
        </Button>
      </form>
    </div>
  );
}
