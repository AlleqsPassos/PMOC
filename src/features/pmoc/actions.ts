"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { formatDateOnly } from "@/lib/format-date";
import { generatePmocSchema } from "@/features/pmoc/schema";
import { findEligibleWorkOrders, getPmocConsolidationData } from "@/features/pmoc/queries";
import { PmocDocument } from "@/features/pmoc/pdf/pmoc-document";

export type PmocFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return slug || "pmoc";
}

/**
 * Gera o PMOC consolidado: busca as OS concluídas do cliente no período,
 * monta o PDF em memória e só grava no banco (pmocs + pmoc_work_orders)
 * depois do upload pro Storage ter sucesso — nunca cria um rascunho órfão
 * (ver nota de fluxo em 0031_pmocs.sql). Requer generate_pmoc.
 */
export async function generatePmoc(
  _prevState: PmocFormState,
  formData: FormData,
): Promise<PmocFormState> {
  const user = await requireUser();
  await assertPermission("generate_pmoc");

  const parsed = generatePmocSchema.safeParse({
    clientId: formData.get("clientId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { clientId, periodStart, periodEnd } = parsed.data;

  const supabase = await createSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("corporate_name")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) {
    return { error: "Cliente não encontrado." };
  }

  const eligibleWorkOrders = await findEligibleWorkOrders(clientId, periodStart, periodEnd);
  if (eligibleWorkOrders.length === 0) {
    return {
      error: "Nenhuma ordem de serviço concluída para este cliente no período selecionado.",
    };
  }

  const title =
    parsed.data.title?.trim() ||
    `PMOC — ${client.corporate_name} — ${formatDateOnly(periodStart)} a ${formatDateOnly(periodEnd)}`;

  const consolidation = await getPmocConsolidationData({
    clientId,
    title,
    periodStart,
    periodEnd,
    workOrders: eligibleWorkOrders,
  });

  const generatedAt = new Date().toISOString();

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      PmocDocument({ data: consolidation, generatedAt, generatedByName: user.fullName }),
    );
  } catch (err) {
    console.error("[generatePmoc] renderToBuffer", err);
    return { error: "Falha ao montar o PDF do PMOC." };
  }

  const path = `company/${user.companyId}/pmoc/${randomUUID()}/${slugify(title)}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("pmoc-pdfs")
    .upload(path, pdfBuffer, { contentType: "application/pdf" });

  if (uploadError) {
    return { error: `Falha ao salvar o PDF: ${uploadError.message}` };
  }

  const { data: pmoc, error: pmocError } = await supabase
    .from("pmocs")
    .insert({
      company_id: user.companyId,
      client_id: clientId,
      period_start: periodStart,
      period_end: periodEnd,
      title,
      status: "generated",
      pdf_storage_path: path,
      generated_by: user.id,
      generated_at: generatedAt,
    })
    .select("id")
    .single();

  if (pmocError || !pmoc) {
    return { error: `PDF gerado, mas falhou ao registrar o PMOC: ${pmocError?.message}` };
  }

  const { error: linksError } = await supabase.from("pmoc_work_orders").insert(
    eligibleWorkOrders.map((wo) => ({
      company_id: user.companyId,
      pmoc_id: pmoc.id,
      work_order_id: wo.id,
    })),
  );
  if (linksError) {
    // PMOC e PDF já existem e são consultáveis — só a rastreabilidade
    // detalhada de quais OS entraram fica incompleta. Não vale reverter.
    console.error("[generatePmoc] pmoc_work_orders", linksError.message);
  }

  revalidatePath("/pmoc");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Signed URL de download — 1h, mesmo padrão de attachments. Requer generate_pmoc. */
export async function getPmocDownloadUrl(
  pmocId: string,
): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();
  await assertPermission("generate_pmoc");

  const supabase = await createSupabaseClient();
  const { data: pmoc, error } = await supabase
    .from("pmocs")
    .select("pdf_storage_path, company_id")
    .eq("id", pmocId)
    .maybeSingle();

  if (error || !pmoc || !pmoc.pdf_storage_path) {
    return { error: "PMOC não encontrado ou ainda sem PDF." };
  }
  // RLS já garante company_id = auth_company_id() — checagem redundante por clareza.
  if (pmoc.company_id !== user.companyId) {
    return { error: "PMOC não encontrado." };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("pmoc-pdfs")
    .createSignedUrl(pmoc.pdf_storage_path, 3600);

  if (signError || !signed) {
    return { error: "Não foi possível gerar o link de download." };
  }

  return { url: signed.signedUrl };
}
