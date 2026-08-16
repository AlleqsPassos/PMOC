"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeChecklistTemplateItem } from "@/features/checklist-templates/actions";

export function ChecklistTemplateItemRemoveButton({
  itemId,
  templateId,
}: {
  itemId: string;
  templateId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => removeChecklistTemplateItem(itemId, templateId))}
    >
      <Trash2 className="text-muted-foreground size-4" />
    </Button>
  );
}
