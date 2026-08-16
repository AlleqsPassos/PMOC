/**
 * Formata uma coluna `date` pura do Postgres (ex: "2026-08-01", sem hora)
 * como dd/MM/yyyy sem passar por `new Date(string)` — `new Date("2026-08-01")`
 * é interpretado como UTC 00:00, e em qualquer fuso atrás de UTC (Brasil,
 * UTC-3) o `date-fns/format` local exibiria o dia anterior. Datas com hora
 * (timestamptz) não têm esse problema e devem continuar usando
 * `format(new Date(iso), ...)` normalmente.
 */
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
