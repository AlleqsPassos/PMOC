"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { recordAttachmentOffline } from "@/features/attachments/offline-actions";
import {
  ATTACHMENT_CATEGORY_LABELS,
  MAX_ATTACHMENTS_PER_CATEGORY,
  type AttachmentCategory,
} from "@/features/attachments/schema";
import { compressImage } from "@/lib/images/compress-image";
import type { OfflineAttachment } from "@/lib/offline/db";

/**
 * Fase 6 — captura a foto local (Blob em `attachmentBlobs`) e enfileira;
 * o upload de verdade só acontece no próximo drain (não dá pra subir
 * binário offline). Preview usa `URL.createObjectURL` do arquivo recém
 * escolhido em vez de esperar a signed URL do Storage — funciona mesmo
 * sem rede.
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
  existing: OfflineAttachment[];
}) {
  const [isPending, startTransition] = useTransition();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = existing.length >= MAX_ATTACHMENTS_PER_CATEGORY;

  function handleFile(file: File) {
    startTransition(async () => {
      // Comprime antes do preview e do registro — tamanho/mime enfileirados
      // no outbox já são os do arquivo comprimido (ver compress-image.ts).
      const compressed = await compressImage(file);
      const objectUrl = URL.createObjectURL(compressed);
      const result = await recordAttachmentOffline({
        companyId,
        workOrderId,
        maintenanceRecordId,
        equipmentId,
        category,
        file: compressed,
      });
      if (result.error) {
        toast.error(result.error);
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (result.id) setPreviews((p) => ({ ...p, [result.id!]: objectUrl }));
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function previewFor(a: OfflineAttachment): string {
    return previews[a.id] ?? "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{ATTACHMENT_CATEGORY_LABELS[category]}</p>
        <span className="text-muted-foreground text-xs">
          {existing.length}/{MAX_ATTACHMENTS_PER_CATEGORY}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {existing.map((a) => {
          const preview = previewFor(a);
          return (
            <div
              key={a.id}
              className="bg-muted flex size-16 items-center justify-center overflow-hidden rounded-md border"
              title={a.storagePath ? "Sincronizado" : "Aguardando conexão para subir"}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={a.fileName} className="size-16 object-cover" />
              ) : (
                <span className="text-muted-foreground px-1 text-center text-[10px]">
                  {a.storagePath ? "Enviada" : "Pendente"}
                </span>
              )}
            </div>
          );
        })}

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
                if (!file) return;
                handleFile(file);
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
  attachments: OfflineAttachment[];
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
