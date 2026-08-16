import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/format-date";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getPmocDetail } from "@/features/pmoc/queries";
import { PmocStatusBadge } from "@/features/pmoc/components/pmoc-status-badge";
import { DownloadPmocButton } from "@/features/pmoc/components/download-pmoc-button";
import { WORK_ORDER_TYPE_LABELS } from "@/features/work-orders/schema";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "PMOC — PMOC+" };

export default async function PmocDetalhePage(props: PageProps<"/pmoc/[pmocId]">) {
  const { pmocId } = await props.params;
  await requireUser();

  const canGenerate = await hasPermission("generate_pmoc");
  if (!canGenerate) {
    return <AccessDenied message="Você não tem permissão para ver PMOC." />;
  }

  const pmoc = await getPmocDetail(pmocId);
  if (!pmoc) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/pmoc" className="hover:underline">
            PMOC
          </Link>{" "}
          / {pmoc.title}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{pmoc.title}</h1>
          <div className="flex items-center gap-2">
            <PmocStatusBadge status={pmoc.status} />
            {pmoc.status === "generated" && <DownloadPmocButton pmocId={pmoc.id} />}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field label="Cliente" value={pmoc.clientName} />
          <Field
            label="Período"
            value={`${formatDateOnly(pmoc.periodStart)} – ${formatDateOnly(pmoc.periodEnd)}`}
          />
          <Field
            label="Gerado em"
            value={
              pmoc.generatedAt
                ? format(new Date(pmoc.generatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : null
            }
          />
          <Field label="Gerado por" value={pmoc.generatedByName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordens de serviço consolidadas</CardTitle>
        </CardHeader>
        <CardContent>
          {pmoc.workOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma OS vinculada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pmoc.workOrders.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/ordens-servico/${wo.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-accent/50"
                >
                  <span>
                    {wo.unitName} — {wo.title}
                  </span>
                  <Badge variant="outline">{WORK_ORDER_TYPE_LABELS[wo.type]}</Badge>
                </Link>
              ))}
            </div>
          )}
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
