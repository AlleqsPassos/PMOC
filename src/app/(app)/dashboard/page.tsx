import type { Metadata } from "next";
import { CalendarClock, FileCheck2, Headset, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getCurrentCompany } from "@/features/companies/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard — PMOC+" };

// Todos os números ficam zerados/vazios de propósito — os módulos que os
// alimentam (chamados, preventivas, equipamentos, PMOC) chegam nas Fases
// 2-5. Nenhum gráfico decorativo: só o que já teria utilidade operacional.
const OVERVIEW_CARDS = [
  {
    title: "Chamados urgentes",
    icon: Headset,
    description: "Nenhum chamado registrado ainda.",
  },
  {
    title: "Preventivas pendentes",
    icon: CalendarClock,
    description: "Nenhuma preventiva cadastrada ainda.",
  },
  {
    title: "Equipamentos",
    icon: Wrench,
    description: "Nenhum equipamento cadastrado ainda.",
  },
  {
    title: "Situação do PMOC",
    icon: FileCheck2,
    description: "Nenhum PMOC gerado ainda.",
  },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const company = await getCurrentCompany();

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
        {OVERVIEW_CARDS.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">0</p>
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
