"use client";

/**
 * Compressão de imagem pré-upload, client-side, sem dependência nova — só
 * `<canvas>` nativo. Reduz o binário antes de cair no outbox (Fase 6),
 * poupando dados/tempo de sync em campo com conectividade ruim (contexto do
 * hospital, seção 12 da arquitetura). Qualquer falha (tipo não suportado,
 * erro de decode, `createImageBitmap` ausente em browser antigo) cai
 * silenciosamente no arquivo original — resiliência importa mais que
 * compressão garantida aqui, o upload nunca deve travar por causa disto.
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const maxDimension = opts.maxDimension ?? 1600;
  const quality = opts.quality ?? 0.75;

  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // Se a compressão não rendeu (foto já pequena/comprimida), mantém o original.
    if (!blob || blob.size >= file.size) return file;

    const newName = `${file.name.replace(/\.[^./]+$/, "")}.jpg`;
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch (err) {
    console.warn("[compressImage] falha ao comprimir, usando arquivo original:", err);
    return file;
  }
}
