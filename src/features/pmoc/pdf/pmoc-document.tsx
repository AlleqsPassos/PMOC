import "server-only";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/format-date";
import { CHECKLIST_ITEM_STATUS_LABELS } from "@/features/maintenance/schema";
import { WORK_ORDER_TYPE_LABELS } from "@/features/work-orders/schema";
import type { PmocConsolidationData } from "@/features/pmoc/queries";

/**
 * Componente @react-pdf/renderer puro — server-only, chamado só de dentro
 * de actions.ts via renderToBuffer(). Nunca importado num client component.
 * Escopo v1: sem fotos embutidas (attachments) — decisão documentada na
 * arquitetura/plano da Fase 5, não omissão.
 */

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 12 },
  headerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1 solid #ccc",
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerCol: { flexDirection: "column", gap: 2 },
  headerLabel: { fontSize: 7, color: "#777", textTransform: "uppercase" },
  headerValue: { fontSize: 10, fontWeight: 700 },
  workOrderBlock: { marginBottom: 14, breakInside: "avoid" },
  workOrderTitle: {
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: "#eef2f6",
    padding: 4,
    marginBottom: 6,
  },
  equipmentBlock: { marginBottom: 10, paddingLeft: 6 },
  equipmentTitle: { fontSize: 10, fontWeight: 700, marginBottom: 3 },
  metaLine: { fontSize: 8, color: "#555", marginBottom: 4 },
  sectionLabel: { fontSize: 8, fontWeight: 700, marginTop: 4, marginBottom: 2 },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #e0e0e0", paddingVertical: 2 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1 solid #999",
    paddingVertical: 2,
    fontWeight: 700,
  },
  colLabel: { flex: 3 },
  colStatus: { flex: 1 },
  colNote: { flex: 3 },
  narrativeRow: { marginBottom: 2 },
  narrativeLabel: { fontSize: 8, fontWeight: 700 },
  narrativeValue: { fontSize: 9 },
  emptyNote: { fontSize: 8, color: "#888", fontStyle: "italic" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
  },
});

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function formatMeasurementValue(m: {
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
}): string {
  const raw = m.valueNumeric !== null ? String(m.valueNumeric) : (m.valueText ?? "—");
  return m.unit ? `${raw} ${m.unit}` : raw;
}

export function PmocDocument({
  data,
  generatedAt,
  generatedByName,
}: {
  data: PmocConsolidationData;
  generatedAt: string;
  generatedByName: string;
}) {
  return (
    <Document title={data.title}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>PMOC+ — Relatório de Manutenção (PMOC)</Text>
        <Text style={styles.subtitle}>{data.title}</Text>

        <View style={styles.headerBox}>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>Empresa prestadora</Text>
            <Text style={styles.headerValue}>{data.company.corporateName}</Text>
            <Text style={styles.metaLine}>{data.company.cnpj ?? "CNPJ não informado"}</Text>
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>Cliente</Text>
            <Text style={styles.headerValue}>{data.client.corporateName}</Text>
            <Text style={styles.metaLine}>{data.client.cnpj ?? "CNPJ não informado"}</Text>
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>Período</Text>
            <Text style={styles.headerValue}>
              {formatDateOnly(data.periodStart)} – {formatDateOnly(data.periodEnd)}
            </Text>
            <Text style={styles.metaLine}>
              Gerado em {formatDateTime(generatedAt)} por {generatedByName}
            </Text>
          </View>
        </View>

        {data.workOrderGroups.length === 0 && (
          <Text style={styles.emptyNote}>Nenhuma ordem de serviço concluída no período.</Text>
        )}

        {data.workOrderGroups.map((wo) => (
          <View key={wo.id} style={styles.workOrderBlock}>
            <Text style={styles.workOrderTitle}>
              {wo.unitName} — {wo.title} ({WORK_ORDER_TYPE_LABELS[wo.type]}) — concluída em{" "}
              {formatDateTime(wo.finishedAt)}
            </Text>

            {wo.equipmentRecords.map((rec) => (
              <View key={rec.id} style={styles.equipmentBlock}>
                <Text style={styles.equipmentTitle}>{rec.equipmentTag}</Text>
                <Text style={styles.metaLine}>
                  Técnico: {rec.technicianName ?? "—"} · Concluído em {formatDateTime(rec.completedAt)}
                </Text>

                {rec.checklistItems.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Checklist</Text>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.colLabel}>Item</Text>
                      <Text style={styles.colStatus}>Status</Text>
                      <Text style={styles.colNote}>Observação</Text>
                    </View>
                    {rec.checklistItems.map((item) => (
                      <View key={item.id} style={styles.tableRow}>
                        <Text style={styles.colLabel}>{item.labelSnapshot}</Text>
                        <Text style={styles.colStatus}>
                          {CHECKLIST_ITEM_STATUS_LABELS[item.status]}
                        </Text>
                        <Text style={styles.colNote}>{item.note ?? "—"}</Text>
                      </View>
                    ))}
                  </>
                )}

                {rec.measurements.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Medições</Text>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.colLabel}>Tipo</Text>
                      <Text style={styles.colStatus}>Valor</Text>
                      <Text style={styles.colNote}>Observação</Text>
                    </View>
                    {rec.measurements.map((m) => (
                      <View key={m.id} style={styles.tableRow}>
                        <Text style={styles.colLabel}>{m.typeLabel}</Text>
                        <Text style={styles.colStatus}>{formatMeasurementValue(m)}</Text>
                        <Text style={styles.colNote}>{m.note ?? "—"}</Text>
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.sectionLabel}>Laudo</Text>
                <View style={styles.narrativeRow}>
                  <Text style={styles.narrativeLabel}>Causa identificada</Text>
                  <Text style={styles.narrativeValue}>{rec.causeIdentified ?? "—"}</Text>
                </View>
                <View style={styles.narrativeRow}>
                  <Text style={styles.narrativeLabel}>Serviço realizado</Text>
                  <Text style={styles.narrativeValue}>{rec.servicePerformed ?? "—"}</Text>
                </View>
                <View style={styles.narrativeRow}>
                  <Text style={styles.narrativeLabel}>Recomendação</Text>
                  <Text style={styles.narrativeValue}>{rec.recommendation ?? "—"}</Text>
                </View>
                <View style={styles.narrativeRow}>
                  <Text style={styles.narrativeLabel}>Diagnóstico</Text>
                  <Text style={styles.narrativeValue}>{rec.diagnosis ?? "—"}</Text>
                </View>
                {rec.notes && (
                  <View style={styles.narrativeRow}>
                    <Text style={styles.narrativeLabel}>Observações</Text>
                    <Text style={styles.narrativeValue}>{rec.notes}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          PMOC+ · Documento gerado eletronicamente · sem fotos anexadas nesta versão do relatório
        </Text>
      </Page>
    </Document>
  );
}
