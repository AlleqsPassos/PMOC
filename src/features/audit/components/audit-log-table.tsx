import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AuditLogEntry } from "@/features/audit/queries";
import { ACTION_LABELS, ENTITY_TYPE_LABELS, isAuditEntityType } from "@/features/audit/schema";
import { computeChangedFields, formatFieldValue } from "@/features/audit/diff";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function entityLabel(entityType: string): string {
  return isAuditEntityType(entityType) ? ENTITY_TYPE_LABELS[entityType] : entityType;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/**
 * Server component — `<details>` nativo faz a expansão do diff sem
 * JavaScript, então a tabela inteira é renderizável no servidor (só os
 * filtros acima dela, na página, precisam de client component).
 */
export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum evento de auditoria encontrado para os filtros selecionados.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quando</TableHead>
          <TableHead>Ator</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead>Entidade</TableHead>
          <TableHead>Detalhes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const changes = computeChangedFields(entry.previousData, entry.newData);
          return (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell>{entry.userName ?? "Sistema"}</TableCell>
              <TableCell>
                <Badge variant="outline">{actionLabel(entry.action)}</Badge>
              </TableCell>
              <TableCell>
                {entityLabel(entry.entityType)}{" "}
                <span className="text-muted-foreground text-xs">
                  {entry.entityId.slice(0, 8)}
                </span>
              </TableCell>
              <TableCell>
                {!entry.previousData && entry.newData ? (
                  // Cobre tanto insert (trigger genérica) quanto os eventos de
                  // negócio sem linha "anterior" (ex: grant/revoke_permission,
                  // gravados em app-layer, sem previous_data por natureza).
                  <details>
                    <summary className="text-muted-foreground cursor-pointer text-xs">
                      {entry.action === "insert" ? "Registro criado" : "Ver detalhes"}
                    </summary>
                    <pre className="bg-muted mt-2 max-w-md overflow-x-auto rounded p-2 text-xs">
                      {JSON.stringify(entry.newData, null, 2)}
                    </pre>
                  </details>
                ) : changes.length > 0 ? (
                  <details>
                    <summary className="text-muted-foreground cursor-pointer text-xs">
                      {changes.length} campo(s) alterado(s)
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs">
                      {changes.map((c) => (
                        <li key={c.field}>
                          <span className="font-medium">{c.field}</span>:{" "}
                          {formatFieldValue(c.before)} → {formatFieldValue(c.after)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <span className="text-muted-foreground text-xs">Sem alteração de campos</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
