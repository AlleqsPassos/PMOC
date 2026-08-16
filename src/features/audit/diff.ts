/**
 * Diff genérico entre previous_data/new_data (snapshots jsonb de linha
 * inteira, gravados pelo trigger). Compara por chave presente em qualquer um
 * dos dois lados — funciona pra qualquer tabela, sem conhecimento por
 * entidade (mantém a UI de auditoria genérica, conforme o plano).
 */
export type FieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

const IGNORED_FIELDS = new Set(["updated_at", "created_at"]);

export function computeChangedFields(
  previous: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
): FieldChange[] {
  if (!previous || !next) return [];

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changes: FieldChange[] = [];

  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const before = previous[key];
    const after = next[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ field: key, before, after });
    }
  }

  return changes;
}

export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
