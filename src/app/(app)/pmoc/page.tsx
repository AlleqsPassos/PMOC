import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/format-date";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listPmocs } from "@/features/pmoc/queries";
import { listClientOptions } from "@/features/clients/queries";
import { GeneratePmocDialog } from "@/features/pmoc/components/generate-pmoc-dialog";
import { PmocStatusBadge } from "@/features/pmoc/components/pmoc-status-badge";
import { DownloadPmocButton } from "@/features/pmoc/components/download-pmoc-button";
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

export const metadata: Metadata = { title: "PMOC — PMOC+" };

export default async function PmocPage() {
  await requireUser();

  const canGenerate = await hasPermission("generate_pmoc");
  if (!canGenerate) {
    return <AccessDenied message="Você não tem permissão para gerar PMOC." />;
  }

  const [pmocs, clientOptions] = await Promise.all([listPmocs(), listClientOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PMOC</h1>
          <p className="text-muted-foreground text-sm">
            Consolidação por cliente/período das ordens de serviço concluídas em todas as
            unidades, num único documento.
          </p>
        </div>
        {clientOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Cadastre um cliente primeiro.</p>
        ) : (
          <GeneratePmocDialog clientOptions={clientOptions} />
        )}
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gerado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pmocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Nenhum PMOC gerado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                pmocs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell>
                      <Link href={`/pmoc/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {formatDateOnly(p.periodStart)} – {formatDateOnly(p.periodEnd)}
                    </TableCell>
                    <TableCell>
                      <PmocStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      {p.generatedAt
                        ? format(new Date(p.generatedAt), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "generated" && <DownloadPmocButton pmocId={p.id} />}
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
