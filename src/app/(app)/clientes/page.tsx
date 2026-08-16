import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listClients } from "@/features/clients/queries";
import { ClientFormDialog } from "@/features/clients/components/client-form-dialog";
import { AccessDenied } from "@/components/shared/access-denied";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Clientes — PMOC+" };

export default async function ClientesPage() {
  await requireUser();

  const canView = await hasPermission("view_clients");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver clientes." />;
  }

  const [clients, canCreate] = await Promise.all([
    listClients(),
    hasPermission("create_clients"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Empresas atendidas pela sua equipe.
          </p>
        </div>
        {canCreate && <ClientFormDialog mode="create" />}
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão social</TableHead>
                <TableHead>Nome fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    Nenhum cliente cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/clientes/${c.id}`} className="hover:underline">
                        {c.corporateName}
                      </Link>
                    </TableCell>
                    <TableCell>{c.tradeName ?? "—"}</TableCell>
                    <TableCell>{c.cnpj ?? "—"}</TableCell>
                    <TableCell>{c.unitsCount}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
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
