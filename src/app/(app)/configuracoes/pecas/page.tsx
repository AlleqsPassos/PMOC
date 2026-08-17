import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listPartsCatalog } from "@/features/parts-catalog/queries";
import { PartCatalogFormDialog } from "@/features/parts-catalog/components/part-catalog-form-dialog";
import { PartCatalogActiveToggle } from "@/features/parts-catalog/components/part-catalog-active-toggle";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Catálogo de peças — PMOC+" };

/**
 * O catálogo que o técnico vê ao pedir uma peça (Fase 10). Nasce com uma lista
 * de peças comuns de climatização, semeada por migration e comum a todas as
 * empresas; cada empresa acrescenta as suas por cima.
 */
export default async function PecasPage() {
  await requireUser();

  const canManage = await hasPermission("manage_parts_catalog");
  if (!canManage) {
    return <AccessDenied message="Você não tem permissão para gerenciar o catálogo de peças." />;
  }

  const parts = await listPartsCatalog();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo de peças</h1>
          <p className="text-muted-foreground text-sm">
            A lista que o técnico seleciona em campo, para não precisar digitar o
            nome da peça.
          </p>
        </div>
        <PartCatalogFormDialog />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peça</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
                    Nenhuma peça no catálogo.
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>{part.unit ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {part.isGlobal ? "Padrão" : "Da empresa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {part.isGlobal ? (
                        // As linhas globais são gerenciadas por migration; a RLS
                        // recusaria a escrita, então não ofereço o botão.
                        <span className="text-muted-foreground text-sm">
                          {part.isActive ? "Ativa" : "Inativa"}
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {!part.isActive && <Badge variant="secondary">Inativa</Badge>}
                          <PartCatalogActiveToggle
                            partId={part.id}
                            isActive={part.isActive}
                          />
                        </div>
                      )}
                    </TableCell>
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
