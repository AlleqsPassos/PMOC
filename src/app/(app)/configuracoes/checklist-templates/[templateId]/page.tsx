import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getChecklistTemplateDetail } from "@/features/checklist-templates/queries";
import { ChecklistTemplateFormDialog } from "@/features/checklist-templates/components/checklist-template-form-dialog";
import { ChecklistTemplateItemForm } from "@/features/checklist-templates/components/checklist-template-item-form";
import { ChecklistTemplateItemRemoveButton } from "@/features/checklist-templates/components/checklist-template-item-remove-button";
import { MAINTENANCE_TYPE_LABELS } from "@/features/checklist-templates/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Template de checklist — PMOC+" };

export default async function ChecklistTemplateDetalhePage(
  props: PageProps<"/configuracoes/checklist-templates/[templateId]">,
) {
  const { templateId } = await props.params;
  await requireUser();

  const canManage = await hasPermission("manage_checklist_templates");
  if (!canManage) {
    return <AccessDenied message="Você não tem permissão para gerenciar templates de checklist." />;
  }

  const template = await getChecklistTemplateDetail(templateId);
  if (!template) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/configuracoes/checklist-templates" className="hover:underline">
            Templates de checklist
          </Link>{" "}
          / {template.name}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            <Badge variant="outline">{MAINTENANCE_TYPE_LABELS[template.maintenanceType]}</Badge>
            {template.equipmentType && <Badge variant="secondary">{template.equipmentType}</Badge>}
          </div>
          <ChecklistTemplateFormDialog mode="edit" template={template} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {template.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum item cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {template.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span>
                    {item.label}
                    {!item.isRequired && (
                      <span className="text-muted-foreground"> (opcional)</span>
                    )}
                    {item.allowsOther && (
                      <span className="text-muted-foreground"> · permite &quot;outro&quot;</span>
                    )}
                  </span>
                  <ChecklistTemplateItemRemoveButton itemId={item.id} templateId={template.id} />
                </div>
              ))}
            </div>
          )}

          <ChecklistTemplateItemForm templateId={template.id} />
        </CardContent>
      </Card>
    </div>
  );
}
