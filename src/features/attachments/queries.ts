import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AttachmentCategory } from "@/features/attachments/schema";

export type AttachmentItem = {
  id: string;
  category: AttachmentCategory;
  fileName: string;
  url: string | null;
};

/** Lista anexos de um registro + gera signed URLs (bucket privado, expira em 1h). */
export async function listAttachmentsByMaintenanceRecord(
  maintenanceRecordId: string,
): Promise<AttachmentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("id, category, storage_path, file_name")
    .eq("maintenance_record_id", maintenanceRecordId)
    .order("created_at");

  if (error) {
    console.error("[listAttachmentsByMaintenanceRecord]", error.message);
    return [];
  }

  const items = data ?? [];
  const signed = await Promise.all(
    items.map((a) =>
      supabase.storage.from("attachments").createSignedUrl(a.storage_path, 3600),
    ),
  );

  return items.map((a, i) => ({
    id: a.id,
    category: a.category,
    fileName: a.file_name,
    url: signed[i].data?.signedUrl ?? null,
  }));
}
