export const ATTACHMENT_CATEGORY = [
  "equipamento",
  "etiqueta",
  "problema",
  "problema_resolvido",
  "temperatura_insuflamento",
  "temperatura_retorno",
  "antes",
  "depois",
  "outro",
] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORY)[number];

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  equipamento: "Equipamento",
  etiqueta: "Etiqueta",
  problema: "Problema",
  problema_resolvido: "Problema resolvido",
  temperatura_insuflamento: "Temp. insuflamento",
  temperatura_retorno: "Temp. retorno",
  antes: "Antes",
  depois: "Depois",
  outro: "Outros",
};

/**
 * Quantas fotos cabem em cada categoria e quais são obrigatórias — os números
 * vêm da especificação do fluxo de corretiva (Fase 10). Antes era uma constante
 * única de 2 para tudo.
 *
 * `required` **avisa, não bloqueia**: decisão explícita do usuário. Faltar foto
 * marca o atendimento como incompleto e aparece na tela do administrador; não
 * trava o técnico em campo, onde câmera falhando ou aparelho em local sem
 * acesso são situações reais.
 */
export const ATTACHMENT_CATEGORY_RULES: Record<
  AttachmentCategory,
  { max: number; required: boolean }
> = {
  equipamento: { max: 1, required: true },
  etiqueta: { max: 1, required: true },
  problema: { max: 2, required: false },
  problema_resolvido: { max: 2, required: false },
  temperatura_insuflamento: { max: 1, required: false },
  temperatura_retorno: { max: 1, required: false },
  // Legado da Fase 4 — fora da UI do técnico, mantidas porque podem existir
  // linhas gravadas e o constraint do banco continua aceitando.
  antes: { max: 2, required: false },
  depois: { max: 2, required: false },
  outro: { max: 5, required: false },
};

/** Categorias do fluxo de corretiva, na ordem em que o técnico as preenche. */
export const CORRECTIVE_ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  "equipamento",
  "etiqueta",
  "problema",
  "problema_resolvido",
  "temperatura_insuflamento",
  "temperatura_retorno",
  "outro",
];

export function maxAttachmentsFor(category: AttachmentCategory): number {
  return ATTACHMENT_CATEGORY_RULES[category].max;
}

/** Categorias obrigatórias que ainda não têm foto — base do aviso de incompleto. */
export function missingRequiredCategories(
  categories: AttachmentCategory[],
  existing: { category: string }[],
): AttachmentCategory[] {
  return categories.filter(
    (c) =>
      ATTACHMENT_CATEGORY_RULES[c].required &&
      !existing.some((a) => a.category === c),
  );
}
