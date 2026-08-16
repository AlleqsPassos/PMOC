import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listAuditLogs } from "@/features/audit/queries";
import { isAuditEntityType } from "@/features/audit/schema";
import { AuditLogFilters } from "@/features/audit/components/audit-log-filters";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Auditoria — PMOC+" };

/** Incrementa uma data "YYYY-MM-DD" em 1 dia sem passar por new Date() em fuso local — mesma cautela já documentada em format-date.ts. */
function nextDayIso(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export default async function AuditoriaPage(props: PageProps<"/auditoria">) {
  const searchParams = await props.searchParams;
  await requireUser();

  const canView = await hasPermission("view_audit_log");
  if (!canView) {
    return <AccessDenied message="Você não tem permissão para ver a auditoria." />;
  }

  const entityTypeParam = typeof searchParams.entityType === "string" ? searchParams.entityType : undefined;
  const entityType = entityTypeParam && isAuditEntityType(entityTypeParam) ? entityTypeParam : undefined;
  const dateFrom = typeof searchParams.dateFrom === "string" ? searchParams.dateFrom : undefined;
  const dateTo = typeof searchParams.dateTo === "string" ? searchParams.dateTo : undefined;
  const pageParam = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const { entries, total, pageSize } = await listAuditLogs({
    entityType,
    dateFrom: dateFrom ? `${dateFrom}T00:00:00-03:00` : undefined,
    dateToExclusive: dateTo ? `${nextDayIso(dateTo)}T00:00:00-03:00` : undefined,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/auditoria?${query}` : "/auditoria";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground text-sm">
          Histórico completo de alterações — criação, edição e mudanças de status em toda a
          empresa.
        </p>
      </div>

      <AuditLogFilters />

      <Card>
        <CardContent>
          <AuditLogTable entries={entries} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Página {page} de {totalPages} — {total} evento(s)
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageHref(page - 1)}>Anterior</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
            )}
            {page < totalPages ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageHref(page + 1)}>Próxima</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Próxima
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
