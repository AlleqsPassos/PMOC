import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getUnitDetail,
  listEnvironmentsForUnit,
  listSectorsForUnit,
} from "@/features/units/queries";
import { listEquipmentByUnit } from "@/features/equipment/queries";
import { UnitFormDialog } from "@/features/units/components/unit-form-dialog";
import { UnitStatusToggle } from "@/features/units/components/unit-status-toggle";
import { SectorFormDialog } from "@/features/units/components/sector-form-dialog";
import { SectorRemoveButton } from "@/features/units/components/sector-remove-button";
import { EnvironmentFormDialog } from "@/features/units/components/environment-form-dialog";
import { EnvironmentRemoveButton } from "@/features/units/components/environment-remove-button";
import { EquipmentFormDialog } from "@/features/equipment/components/equipment-form-dialog";
import { EquipmentStatusSelect } from "@/features/equipment/components/equipment-status-select";
import { EquipmentStatusBadge } from "@/features/equipment/components/equipment-status-badge";
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

export const metadata: Metadata = { title: "Unidade — PMOC+" };

export default async function UnidadeDetalhePage(
  props: PageProps<"/unidades/[unitId]">,
) {
  const { unitId } = await props.params;
  await requireUser();

  const canView = await hasPermission("view_units");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver unidades." />;
  }

  const unit = await getUnitDetail(unitId);
  if (!unit) notFound();

  const [
    sectors,
    environments,
    equipment,
    canEditUnit,
    canEditEnvironments,
    canViewEquipment,
    canCreateEquipment,
    canEditEquipment,
  ] = await Promise.all([
    listSectorsForUnit(unitId),
    listEnvironmentsForUnit(unitId),
    listEquipmentByUnit(unitId),
    hasPermission("edit_units"),
    hasPermission("edit_environments"),
    hasPermission("view_equipment"),
    hasPermission("create_equipment"),
    hasPermission("edit_equipment"),
  ]);

  const unitOptions = [{ id: unit.id, name: unit.name, clientName: unit.clientName }];
  const sectorOptions = sectors.map((s) => ({ id: s.id, name: s.name, unitId: unit.id }));
  const environmentOptions = environments.map((e) => ({
    id: e.id,
    name: e.name,
    unitId: unit.id,
    sectorId: e.sectorId,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/clientes" className="hover:underline">
            Clientes
          </Link>{" "}
          /{" "}
          <Link href={`/clientes/${unit.clientId}`} className="hover:underline">
            {unit.clientName}
          </Link>{" "}
          / {unit.name}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{unit.name}</h1>
          {canEditUnit && (
            <div className="flex items-center gap-2">
              <UnitStatusToggle unitId={unit.id} status={unit.status} />
              <UnitFormDialog mode="edit" unit={unit} clientOptions={[]} />
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Responsável</p>
            <p>{unit.responsibleName ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Telefone</p>
            <p>{unit.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <StatusBadge status={unit.status} />
          </div>
          {unit.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-muted-foreground text-xs">Observações</p>
              <p>{unit.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Setores</CardTitle>
          {canEditEnvironments && <SectorFormDialog mode="create" unitId={unit.id} />}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Observações</TableHead>
                {canEditEnvironments && <TableHead className="w-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEditEnvironments ? 3 : 2}
                    className="text-muted-foreground text-center"
                  >
                    Nenhum setor cadastrado — camada opcional, ambientes podem
                    ficar direto na unidade.
                  </TableCell>
                </TableRow>
              ) : (
                sectors.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.notes ?? "—"}
                    </TableCell>
                    {canEditEnvironments && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <SectorFormDialog mode="edit" unitId={unit.id} sector={s} />
                          <SectorRemoveButton
                            sectorId={s.id}
                            unitId={unit.id}
                            name={s.name}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Ambientes</CardTitle>
          {canEditEnvironments && (
            <EnvironmentFormDialog mode="create" unitId={unit.id} sectors={sectors} />
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Observações</TableHead>
                {canEditEnvironments && <TableHead className="w-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {environments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEditEnvironments ? 4 : 3}
                    className="text-muted-foreground text-center"
                  >
                    Nenhum ambiente cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                environments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.sectorName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.notes ?? "—"}
                    </TableCell>
                    {canEditEnvironments && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EnvironmentFormDialog
                            mode="edit"
                            unitId={unit.id}
                            sectors={sectors}
                            environment={e}
                          />
                          <EnvironmentRemoveButton
                            environmentId={e.id}
                            unitId={unit.id}
                            name={e.name}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canViewEquipment && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Equipamentos</CardTitle>
            {canCreateEquipment && (
              <EquipmentFormDialog
                mode="create"
                fixedUnitId={unit.id}
                unitOptions={unitOptions}
                sectorOptions={sectorOptions}
                environmentOptions={environmentOptions}
              />
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center">
                      Nenhum equipamento cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipment.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">
                        <Link href={`/equipamentos/${eq.id}`} className="hover:underline">
                          {eq.tag}
                        </Link>
                      </TableCell>
                      <TableCell>{eq.environmentName}</TableCell>
                      <TableCell>
                        {[eq.brand, eq.model].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell>
                        {canEditEquipment ? (
                          <EquipmentStatusSelect equipmentId={eq.id} status={eq.status} />
                        ) : (
                          <EquipmentStatusBadge status={eq.status} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
