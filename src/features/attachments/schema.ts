export const ATTACHMENT_CATEGORY = [
  "equipamento",
  "etiqueta",
  "problema",
  "antes",
  "depois",
  "outro",
] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORY)[number];

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  equipamento: "Equipamento",
  etiqueta: "Etiqueta",
  problema: "Problema",
  antes: "Antes",
  depois: "Depois",
  outro: "Outro",
};

/** Limite validado na Server Action, não como constraint de banco (seção 3 da arquitetura). */
export const MAX_ATTACHMENTS_PER_CATEGORY = 2;
