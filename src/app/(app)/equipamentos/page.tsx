import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getUserPermissionKeys, hasPermission } from "@/lib/auth/permissions";
import { isDispatcherFromKeys } from "@/lib/auth/is-dispatcher";
import { EquipamentosTecnicoView } from "@/features/equipment/components/equipamentos-tecnico-view";
import { listEquipment } from "@/features/equipment/queries";
import { listClientOptions } from "@/features/clients/queries";
import { listUnitOptions, listSectorOptions, listEnvironmentOptions } from "@/features/units/queries";
import { EquipmentFormDialog } from "@/features/equipment/components/equipment-form-dialog";
import { EquipmentFilters } from "@/features/equipment/components/equipment-filters";
import { EquipmentStatusSelect } from "@/features/equipment/components/equipment-status-select";
import { EquipmentStatusBadge } from "@/features/equipment/components/equipment-status-badge";
import { EQUIPMENT_STATUS, type EquipmentStatus } from "@/features/equipment/schema";
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

export const metadata: Metadata = { title: "Equipamentos — PMOC+" };

function isEquipmentStatus(value: string | undefined): value is EquipmentStatus {
  return !!value && (EQUIPMENT_STATUS as readonly string[]).includes(value);
}

/**
 * Duas visões na mesma rota, ramificadas por público — mesmo padrão de
 * `/dashboard` e `/minhas-atividades`.
 *
 * O despachante fica com a tabela server-rendered de sempre. O técnico recebe a
 * visão local-first (Fase 10): ele voltou a ter menu de Equipamentos, com a
 * planta inteira, porque pode passar um dia só atualizando cadastro — e a tela
 * dele precisa abrir em campo, sem rede, coisa que esta aqui não faz.
 */
export default async function EquipamentosPage(props: PageProps<"/equipamentos">) {
  const searchParams = await props.searchParams;
  await requireUser();

  const [canView, keys] = await Promise.all([
    hasPermission("view_equipment"),
    getUserPermissionKeys(),
  ]);
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver equipamentos." />;
  }

  if (!isDispatcherFromKeys(keys)) {
    const unidade = typeof searchParams.unidade === "string" ? searchParams.unidade : undefined;
    return <EquipamentosTecnicoView initialUnitId={unidade} />;
  }

  const clientId = typeof searchParams.clientId === "string" ? searchParams.clientId : undefined;
  const unitId = typeof searchParams.unitId === "string" ? searchParams.unitId : undefined;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const status = isEquipmentStatus(statusParam) ? statusParam : undefined;

  const [equipment, clientOptions, unitOptions, sectorOptions, environmentOptions, canCreate, canEdit] =
    await Promise.all([
      listEquipment({ clientId, unitId, status }),
      listClientOptions(),
      listUnitOptions(),
      listSectorOptions(),
      listEnvironmentOptions(),
      hasPermission("create_equipment"),
      hasPermission("edit_equipment"),
    ]);

  const unitOptionsForForm = unitOptions.map((u) => ({
    id: u.id,
    name: u.name,
    clientName: clientOptions.find((c) => c.id === u.clientId)?.corporateName ?? "—",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground text-sm">
            Todos os equipamentos climatizados cadastrados.
          </p>
        </div>
        {canCreate &&
          (unitOptionsForForm.length === 0 ? (
            <p className="text-muted-foreground text-sm">Cadastre uma unidade primeiro.</p>
          ) : (
            <EquipmentFormDialog
              mode="create"
              unitOptions={unitOptionsForForm}
              sectorOptions={sectorOptions}
              environmentOptions={environmentOptions}
            />
          ))}
      </div>

      <EquipmentFilters clientOptions={clientOptions} unitOptions={unitOptions} />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center">
                    Nenhum equipamento encontrado.
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
                    <TableCell>{eq.clientName}</TableCell>
                    <TableCell>
                      <Link href={`/unidades/${eq.unitId}`} className="hover:underline">
                        {eq.unitName}
                      </Link>
                    </TableCell>
                    <TableCell>{eq.environmentName}</TableCell>
                    <TableCell>{[eq.brand, eq.model].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell>
                      {canEdit ? (
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
    </div>
  );
}
