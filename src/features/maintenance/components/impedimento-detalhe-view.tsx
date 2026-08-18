"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TriangleAlert } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { NarrativeForm } from "@/features/maintenance/components/narrative-form";
import { AttachmentUploaderGroup } from "@/features/attachments/components/attachment-uploader";
import { IMPEDIMENT_ATTACHMENT_CATEGORIES } from "@/features/attachments/schema";
import { PartsRequestDialog } from "@/features/parts-requests/components/parts-request-dialog";
import { TicketPriorityBadge } from "@/features/tickets/components/ticket-priority-badge";
import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";
import {
  TICKET_CLOSED_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "@/features/tickets/schema";
import { PageBackHeader } from "@/components/shared/page-back-header";
import { WorkBucketBadge } from "@/components/shared/work-bucket-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoment(iso: string | null): string {
  if (!iso) return "data não registrada";
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * O impedimento de um equipamento, por inteiro (Fase 14).
 *
 * Antes, tocar num equipamento impedido levava de volta à preventiva do
 * ambiente — a sala inteira, com a grade de medições e o checklist, e o aparelho
 * defeituoso listado ao lado de outro já concluído. Estava errado por dentro:
 * um impedimento **não é** um passo da preventiva, é um chamado. O que ele
 * precisa mostrar é o que aconteceu com aquele aparelho: o defeito relatado,
 * quem abriu e quando, as fotos, a peça pedida e o laudo.
 *
 * Sem medição, sem checklist e sem botão de concluir: quem decide o que vai ser
 * feito, quando e por quem, é o administrador. O técnico documenta.
 */
export function ImpedimentoDetalheView({
  unitId,
  maintenanceRecordId,
}: {
  unitId: string;
  maintenanceRecordId: string;
}) {
  const partsRef = useRef<HTMLDivElement>(null);
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [record, meta] = await Promise.all([
      offlineDb.maintenanceRecords.get(maintenanceRecordId),
      offlineDb.meta.get("companyId"),
    ]);
    if (!record) return { missing: true as const };

    const [workOrder, attachments, partsRequests, tickets, equipment, unit] =
      await Promise.all([
        offlineDb.workOrders.get(record.workOrderId),
        offlineDb.attachments.where("maintenanceRecordId").equals(record.id).toArray(),
        offlineDb.partsRequests.where("maintenanceRecordId").equals(record.id).toArray(),
        offlineDb.tickets.where("equipmentId").equals(record.equipmentId).toArray(),
        offlineDb.equipment.get(record.equipmentId),
        offlineDb.units.get(unitId),
      ]);

    const environment = equipment
      ? await offlineDb.environments.get(equipment.environmentId)
      : undefined;
    const sector = environment?.sectorId
      ? await offlineDb.sectors.get(environment.sectorId)
      : undefined;

    // O chamado aberto para este aparelho — o mais recente que ainda está de pé.
    const ticket = tickets
      .filter((t) => !TICKET_CLOSED_STATUSES.includes(t.status as TicketStatus))
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];

    return {
      missing: false as const,
      record,
      workOrder,
      ticket,
      attachments,
      partsRequests,
      equipment,
      unitName: unit?.name ?? workOrder?.unitName ?? "Unidade",
      location:
        [sector?.name, environment?.name].filter(Boolean).join(" · ") ||
        "Sem localização registrada",
      companyId: meta?.value ?? "",
    };
  }, [unitId, maintenanceRecordId]);

  if (!data) {
    return <p className="text-muted-foreground text-sm">Carregando…</p>;
  }

  if (data.missing) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Este atendimento ainda não foi baixado neste dispositivo. Conecte-se à
          internet e toque no ícone de atualizar, ao lado do indicador de
          sincronização no topo da tela.
        </CardContent>
      </Card>
    );
  }

  const { record, ticket } = data;
  const waitingParts = record.resolution === "aguardando_peca";

  return (
    <div className="flex flex-col gap-6">
      <PageBackHeader
        backHref={`/minhas-atividades/${unitId}`}
        backLabel={data.unitName}
        title={record.equipmentTag}
        subtitle={data.location}
        actions={<WorkBucketBadge tone="impedimento">Impedimento</WorkBucketBadge>}
      />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TriangleAlert className="text-destructive size-4" />
            {ticket ? "Chamado aberto" : "Aguardando peça"}
          </CardTitle>
          <CardDescription>
            O administrador vai definir quando e quem resolve. Até lá, este
            equipamento fica pendente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {ticket ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{ticket.title}</span>
                <TicketPriorityBadge priority={ticket.priority as TicketPriority} />
                <TicketStatusBadge status={ticket.status as TicketStatus} />
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {ticket.description ?? "Sem descrição registrada."}
              </p>
              <p className="text-muted-foreground text-xs">
                Chamado aberto por {ticket.openedByName ?? "usuário não identificado"} em{" "}
                {formatMoment(ticket.openedAt)}.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              O atendimento foi encerrado como{" "}
              <span className="font-medium">aguardando peça</span>. Assim que o
              material chegar, o administrador libera o equipamento para você.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipamento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Tag" value={record.equipmentTag} />
          <Info label="Localização" value={data.location} />
          <Info label="Tipo" value={data.equipment?.type ?? "—"} />
          <Info
            label="Marca / modelo"
            value={
              [data.equipment?.brand, data.equipment?.model].filter(Boolean).join(" ") || "—"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos do problema</CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentUploaderGroup
            companyId={data.companyId}
            workOrderId={record.workOrderId}
            maintenanceRecordId={record.id}
            equipmentId={record.equipmentId}
            categories={IMPEDIMENT_ATTACHMENT_CATEGORIES}
            attachments={data.attachments}
            readOnly={waitingParts}
          />
        </CardContent>
      </Card>

      <Card ref={partsRef}>
        <CardHeader>
          <CardTitle className="text-base">Peças</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.partsRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma peça solicitada ainda.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {data.partsRequests.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {p.partName} × {p.quantity}
                  </span>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
          {/* Aguardando peça já está travado pelo administrador (Fase 12); um
              impedimento recém-aberto ainda aceita completar o registro. */}
          {!waitingParts && (
            <PartsRequestDialog
              workOrderId={record.workOrderId}
              maintenanceRecordId={record.id}
              open={partsDialogOpen}
              onOpenChange={setPartsDialogOpen}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Laudo</CardTitle>
          <CardDescription>
            O que você encontrou e o que recomenda — é isso que o administrador lê
            para decidir o próximo passo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NarrativeForm record={record} disabled={waitingParts} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
