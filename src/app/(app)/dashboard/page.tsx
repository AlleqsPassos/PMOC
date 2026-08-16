import type { Metadata } from "next";
import { CalendarClock, FileCheck2, Headset, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getCurrentCompany } from "@/features/companies/queries";
import { countEquipment } from "@/features/equipment/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard — PMOC+" };

// Chamados/preventivas/PMOC ficam zerados de propósito — os módulos que os
// alimentam chegam nas Fases 3-5. Equipamentos já mostra contagem real
// (Fase 2). Nenhum gráfico decorativo: só o que já tem utilidade operacional.
export default async function DashboardPage() {
  const [user, company, equipmentCount] = await Promise.all([
    requireUser(),
    getCurrentCompany(),
    countEquipment(),
  ]);

  const overviewCards = [
    {
      title: "Chamados urgentes",
      icon: Headset,
      value: "0",
      description: "Nenhum chamado registrado ainda.",
    },
    {
      title: "Preventivas pendentes",
      icon: CalendarClock,
      value: "0",
      description: "Nenhuma preventiva cadastrada ainda.",
    },
    {
      title: "Equipamentos",
      icon: Wrench,
      value: String(equipmentCount),
      description:
        equipmentCount === 0
          ? "Nenhum equipamento cadastrado ainda."
          : "Cadastrados na hierarquia cliente/unidade.",
    },
    {
      title: "Situação do PMOC",
      icon: FileCheck2,
      value: "0",
      description: "Nenhum PMOC gerado ainda.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          {company?.corporate_name ?? "Sua empresa"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-muted-foreground text-xs">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendências</CardTitle>
          <CardDescription>
            Nada por aqui ainda — os módulos de clientes, equipamentos,
            chamados e preventivas chegam nas próximas fases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
