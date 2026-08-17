import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listClientOptions } from "@/features/clients/queries";
import { UnitSetupWizard } from "@/features/units/components/unit-setup-wizard";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nova unidade — PMOC+" };

export default async function NovaUnidadePage(
  props: PageProps<"/unidades/nova">,
) {
  await requireUser();

  const canCreate = await hasPermission("create_units");
  if (!canCreate) {
    return <AccessDenied message="Você não tem permissão para criar unidades." />;
  }

  const { clientId } = await props.searchParams;
  const fixedClientId = typeof clientId === "string" ? clientId : undefined;
  const clients = await listClientOptions();

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Cadastre um cliente antes de criar unidades.{" "}
          <Link href="/clientes" className="text-primary hover:underline">
            Ir para clientes
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/unidades" className="hover:underline">
            Unidades
          </Link>{" "}
          / Nova
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Nova unidade</h1>
        <p className="text-muted-foreground text-sm">
          Cadastre a unidade e, na sequência, os setores, ambientes e
          equipamentos. Cada etapa é salva na hora — dá para parar no meio e
          continuar depois pela página da unidade.
        </p>
      </div>

      <UnitSetupWizard
        clients={clients.map((c) => ({ id: c.id, name: c.corporateName }))}
        fixedClientId={fixedClientId}
      />
    </div>
  );
}
