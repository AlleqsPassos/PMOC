import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listMyTickets } from "@/features/tickets/queries";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Minhas atividades — PMOC+" };

// "Meu dia" do técnico — só os chamados atribuídos a ele, ainda em aberto.
// Ordens de serviço e preventivas entram aqui na Fase 4/5; por ora é só a
// fila de chamados.
export default async function MinhasAtividadesPage() {
  const user = await requireUser();

  const canView = await hasPermission("view_tickets");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver chamados." />;
  }

  const tickets = await listMyTickets(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas atividades</h1>
        <p className="text-muted-foreground text-sm">
          Chamados atribuídos a você, mais antigos primeiro.
        </p>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Nenhum chamado atribuído a você no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/chamados/${t.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <TicketPriorityBadge priority={t.priority} />
                    <TicketStatusBadge status={t.status} />
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>
                    {t.clientName} — {t.unitName}
                    {t.equipmentTag ? ` — ${t.equipmentTag}` : ""}
                  </span>
                  <span>{format(new Date(t.openedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
