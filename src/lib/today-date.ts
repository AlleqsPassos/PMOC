/**
 * "Hoje" como string "YYYY-MM-DD" no fuso da operação (Brasil), sem passar
 * por `new Date(string)`/UTC — mesma cautela já documentada em
 * src/lib/format-date.ts: comparar uma coluna `date` pura contra "hoje"
 * calculado em UTC pode acertar/errar o dia por causa do fuso (Brasil,
 * UTC-3). `Intl.DateTimeFormat` com `timeZone` explícito calcula o dia
 * corrente já no fuso certo, sem essa armadilha.
 */
export function getTodayDateString(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}
