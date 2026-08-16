import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarClock, FileCheck2, Headset, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentCompany } from "@/features/companies/queries";
import { countEquipment } from "@/features/equipment/queries";
import { countUrgentOpenTickets } from "@/features/tickets/queries";
import { countActivePreventivePlans } from "@/features/preventive-plans/queries";
import { countOverdueWorkOrders } from "@/features/work-orders/queries";
import { countGeneratedPmocs } from "@/features/pmoc/queries";
import { listRecentAuditActivity } from "@/features/audit/queries";
import { ACTION_LABELS, ENTITY_TYPE_LABELS, isAuditEntityType } from "@/features/audit/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard — PMOC+" };

// Todos os cards mostram dado real (5º card "OS atrasadas" chegou na Fase
// 7). Nenhum gráfico decorativo: só o que já tem utilidade operacional.
export default async function DashboardPage() {
  const [
    user,
    company,
    equipmentCount,
    urgentTicketsCount,
    activePreventivePlansCount,
    overdueWorkOrdersCount,
    generatedPmocsCount,
    canViewAudit,
  ] = await Promise.all([
    requireUser(),
    getCurrentCompany(),
    countEquipment(),
    countUrgentOpenTickets(),
    countActivePreventivePlans(),
    countOverdueWorkOrders(),
    countGeneratedPmocs(),
    hasPermission("view_audit_log"),
  ]);

  const recentActivity = canViewAudit ? await listRecentAuditActivity(5) : [];

  const overviewCards = [
    {
      title: "Chamados urgentes",
      icon: Headset,
      value: String(urgentTicketsCount),
      description:
        urgentTicketsCount === 0
          ? "Nenhum chamado urgente em aberto."
          : "Prioridade urgente, ainda não concluídos.",
    },
    {
      title: "Preventivas pendentes",
      icon: CalendarClock,
      value: String(activePreventivePlansCount),
      description:
        activePreventivePlansCount === 0
          ? "Nenhum plano preventivo ativo."
          : "Planos preventivos ativos.",
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
      title: "OS atrasadas",
      icon: AlertTriangle,
      value: String(overdueWorkOrdersCount),
      description:
        overdueWorkOrdersCount === 0
          ? "Nenhuma OS atrasada."
          : "Data programada já passou, ainda não concluídas.",
    },
    {
      title: "Situação do PMOC",
      icon: FileCheck2,
      value: String(generatedPmocsCount),
      description:
        generatedPmocsCount === 0
          ? "Nenhum PMOC gerado ainda."
          : "PMOCs consolidados e disponíveis para download.",
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

      {canViewAudit && (
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
            <CardDescription>Últimos eventos registrados na empresa.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma atividade registrada ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {entry.userName ?? "Sistema"}
                    </span>{" "}
                    {(ACTION_LABELS[entry.action] ?? entry.action).toLowerCase()} —{" "}
                    {isAuditEntityType(entry.entityType)
                      ? ENTITY_TYPE_LABELS[entry.entityType]
                      : entry.entityType}{" "}
                    · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/auditoria"
              className="text-primary mt-3 inline-block text-sm hover:underline"
            >
              Ver auditoria completa →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
