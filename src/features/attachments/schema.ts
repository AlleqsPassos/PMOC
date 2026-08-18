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
 * `required` **bloqueia** desde a Fase 11: sem a foto do equipamento e a da
 * etiqueta o técnico não conclui nem solicita peça. A Fase 10 tinha escolhido só
 * avisar, para não prender ninguém em campo por uma câmera que não abriu — o
 * usuário reverteu depois de usar a tela: o aviso era ignorado, e são essas duas
 * fotos que provam no PMOC que o aparelho certo foi atendido.
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

/**
 * Categorias da tela de impedimento (Fase 14) — o que descreve um aparelho
 * parado. Sem equipamento/etiqueta obrigatórias: essas provam o atendimento no
 * PMOC, e um impedimento não é um atendimento concluído; exigi-las aqui só
 * atrapalharia quem está registrando um defeito.
 */
export const IMPEDIMENT_ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  "problema",
  "problema_resolvido",
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
