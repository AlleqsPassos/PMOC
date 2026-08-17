import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listChecklistTemplates } from "@/features/checklist-templates/queries";
import { listEquipmentTypes } from "@/features/equipment/queries";
import { ChecklistTemplateFormDialog } from "@/features/checklist-templates/components/checklist-template-form-dialog";
import { MAINTENANCE_TYPE_LABELS } from "@/features/checklist-templates/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Templates de checklist — PMOC+" };

export default async function ChecklistTemplatesPage() {
  await requireUser();

  const canManage = await hasPermission("manage_checklist_templates");
  if (!canManage) {
    return <AccessDenied message="Você não tem permissão para gerenciar templates de checklist." />;
  }

  const [templates, equipmentTypes] = await Promise.all([
    listChecklistTemplates(),
    listEquipmentTypes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates de checklist</h1>
          <p className="text-muted-foreground text-sm">
            Usados na execução de ordens de serviço — corretivas, preventivas ou ambas.
          </p>
        </div>
        <ChecklistTemplateFormDialog mode="create" equipmentTypes={equipmentTypes} />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Aplica-se a</TableHead>
                <TableHead>Tipo de equipamento</TableHead>
                <TableHead>Itens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
                    Nenhum template cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/configuracoes/checklist-templates/${t.id}`}
                        className="hover:underline"
                      >
                        {t.name}
                      </Link>
                    </TableCell>
                    <TableCell>{MAINTENANCE_TYPE_LABELS[t.maintenanceType]}</TableCell>
                    <TableCell>{t.equipmentType ?? "—"}</TableCell>
                    <TableCell>{t.itemsCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
