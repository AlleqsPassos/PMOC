import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getClientById } from "@/features/clients/queries";
import { listUnitsForClient } from "@/features/units/queries";
import { ClientFormDialog } from "@/features/clients/components/client-form-dialog";
import { ClientStatusToggle } from "@/features/clients/components/client-status-toggle";
import { UnitFormDialog } from "@/features/units/components/unit-form-dialog";
import { AccessDenied } from "@/components/shared/access-denied";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Cliente — PMOC+" };

export default async function ClienteDetalhePage(
  props: PageProps<"/clientes/[clientId]">,
) {
  const { clientId } = await props.params;
  await requireUser();

  const canView = await hasPermission("view_clients");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver clientes." />;
  }

  const client = await getClientById(clientId);
  if (!client) notFound();

  const [units, canEdit, canCreateUnit] = await Promise.all([
    listUnitsForClient(clientId),
    hasPermission("edit_clients"),
    hasPermission("create_units"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/clientes" className="hover:underline">
            Clientes
          </Link>{" "}
          / {client.corporateName}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {client.corporateName}
          </h1>
          {canEdit && (
            <div className="flex items-center gap-2">
              <ClientStatusToggle clientId={client.id} status={client.status} />
              <ClientFormDialog mode="edit" client={client} />
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Nome fantasia" value={client.tradeName} />
          <Field label="CNPJ" value={client.cnpj} />
          <Field label="Telefone" value={client.phone} />
          <Field label="E-mail" value={client.email} />
          <Field label="Responsável" value={client.responsibleName} />
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <StatusBadge status={client.status} />
          </div>
          {client.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-muted-foreground text-xs">Observações</p>
              <p>{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Unidades</CardTitle>
          {canCreateUnit && (
            <UnitFormDialog
              mode="create"
              clientOptions={[]}
              fixedClientId={client.id}
              fixedClientName={client.corporateName}
            />
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ambientes</TableHead>
                <TableHead>Equipamentos</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value ?? "—"}</p>
    </div>
  );
}
