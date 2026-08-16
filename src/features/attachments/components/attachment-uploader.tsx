"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { recordAttachment } from "@/features/attachments/actions";
import {
  ATTACHMENT_CATEGORY_LABELS,
  MAX_ATTACHMENTS_PER_CATEGORY,
  type AttachmentCategory,
} from "@/features/attachments/schema";
import type { AttachmentItem } from "@/features/attachments/queries";

/**
 * Upload direto pro Storage a partir do client component (não via Server
 * Action — binário grande não é um bom caminho pra Server Action). A
 * policy de storage.objects (0026) é a fronteira de segurança; a Server
 * Action recordAttachment só grava metadados e reforça o limite/permissão.
 */
export function AttachmentUploader({
  companyId,
  workOrderId,
  maintenanceRecordId,
  equipmentId,
  category,
  existing,
}: {
  companyId: string;
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  category: AttachmentCategory;
  existing: AttachmentItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(existing.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const atLimit = count >= MAX_ATTACHMENTS_PER_CATEGORY;

  function handleFile(file: File) {
    startTransition(async () => {
      const supabase = createClient();
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `company/${companyId}/work-orders/${workOrderId}/${category}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        toast.error(`Falha no upload: ${uploadError.message}`);
        return;
      }

      const result = await recordAttachment({
        workOrderId,
        maintenanceRecordId,
        equipmentId,
        category,
        storagePath: path,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCount((c) => c + 1);
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{ATTACHMENT_CATEGORY_LABELS[category]}</p>
        <span className="text-muted-foreground text-xs">
          {count}/{MAX_ATTACHMENTS_PER_CATEGORY}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {existing.map((a) => (
          <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noreferrer">
            {a.url ? (
              // Signed URL de bucket privado, expira em 1h — sem remote
              // pattern fixo pra next/image otimizar.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.url}
                alt={a.fileName}
                className="size-16 rounded-md border object-cover"
              />
            ) : (
              <span className="text-muted-foreground text-xs">{a.fileName}</span>
            )}
          </a>
        ))}

        {!atLimit && (
          <label className="border-input hover:bg-accent/50 flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs">
            <Upload className="size-4" />
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {isPending ? "…" : "Adicionar"}
          </label>
        )}
      </div>
    </div>
  );
}

export function AttachmentUploaderGroup({
  companyId,
  workOrderId,
  maintenanceRecordId,
  equipmentId,
  categories,
  attachments,
}: {
  companyId: string;
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  categories: AttachmentCategory[];
  attachments: AttachmentItem[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {categories.map((category) => (
        <AttachmentUploader
          key={category}
          companyId={companyId}
          workOrderId={workOrderId}
          maintenanceRecordId={maintenanceRecordId}
          equipmentId={equipmentId}
          category={category}
          existing={attachments.filter((a) => a.category === category)}
        />
      ))}
    </div>
  );
}
