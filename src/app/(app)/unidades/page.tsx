import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listUnits } from "@/features/units/queries";
import { listClientOptions } from "@/features/clients/queries";
import { UnitFormDialog } from "@/features/units/components/unit-form-dialog";
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

export const metadata: Metadata = { title: "Unidades — PMOC+" };

export default async function UnidadesPage() {
  await requireUser();

  const canView = await hasPermission("view_units");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver unidades." />;
  }

  const [units, clientOptions, canCreate] = await Promise.all([
    listUnits(),
    listClientOptions(),
    hasPermission("create_units"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground text-sm">
            Todas as unidades físicas dos seus clientes.
          </p>
        </div>
        {canCreate &&
          (clientOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Cadastre um cliente primeiro.
            </p>
          ) : (
            <UnitFormDialog mode="create" clientOptions={clientOptions} />
          ))}
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Setores</TableHead>
                <TableHead>Ambientes</TableHead>
                <TableHead>Equipamentos</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Nenhuma unidade cadastrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <Link href={`/unidades/${u.id}`} className="hover:underline">
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clientes/${u.clientId}`} className="hover:underline">
                        {u.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>{u.sectorsCount}</TableCell>
                    <TableCell>{u.environmentsCount}</TableCell>
                    <TableCell>{u.equipmentCount}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
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
