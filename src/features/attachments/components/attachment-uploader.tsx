"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImageIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  recordAttachmentOffline,
  removeAttachmentOffline,
} from "@/features/attachments/offline-actions";
import {
  ATTACHMENT_CATEGORY_LABELS,
  ATTACHMENT_CATEGORY_RULES,
  type AttachmentCategory,
} from "@/features/attachments/schema";
import { compressImage } from "@/lib/images/compress-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OfflineAttachment } from "@/lib/offline/db";

/**
 * Fase 6 — captura a foto local (Blob em `attachmentBlobs`) e enfileira;
 * o upload de verdade só acontece no próximo drain (não dá pra subir
 * binário offline). Preview usa `URL.createObjectURL` do arquivo recém
 * escolhido em vez de esperar a signed URL do Storage — funciona mesmo
 * sem rede.
 *
 * Fase 10 — limite e obrigatoriedade por categoria (não mais uma constante
 * única), botão "+" em vez da palavra "Adicionar", com escolha explícita entre
 * câmera e galeria, e a possibilidade de remover para trocar a foto (as
 * categorias obrigatórias cabem uma só).
 */
export function AttachmentUploader({
  companyId,
  workOrderId,
  maintenanceRecordId,
  equipmentId,
  category,
  existing,
  readOnly,
}: {
  companyId: string;
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  category: AttachmentCategory;
  existing: OfflineAttachment[];
  /** OS fechada — as fotos continuam visíveis, mas o registro não muda mais. */
  readOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { max, required } = ATTACHMENT_CATEGORY_RULES[category];
  const atLimit = existing.length >= max;
  const missing = required && existing.length === 0;

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
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeAttachmentOffline(id);
      setPreviews((p) => {
        const url = p[id];
        if (url) URL.revokeObjectURL(url);
        const rest = { ...p };
        delete rest[id];
        return rest;
      });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {ATTACHMENT_CATEGORY_LABELS[category]}
          {required && (
            <span
              className={missing ? "text-destructive" : "text-muted-foreground"}
              title="Foto obrigatória"
            >
              {" "}
              *
            </span>
          )}
        </p>
        <span className="text-muted-foreground text-xs">
          {existing.length}/{max}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {existing.map((a) => {
          const preview = previews[a.id] ?? "";
          return (
            <div key={a.id} className="relative">
              <div
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
              <button
                type="button"
                disabled={isPending || readOnly}
                hidden={readOnly}
                onClick={() => handleRemove(a.id)}
                aria-label={`Remover foto de ${ATTACHMENT_CATEGORY_LABELS[category]}`}
                className="bg-background text-muted-foreground hover:text-destructive absolute -top-1.5 -right-1.5 rounded-full border p-0.5 shadow-sm"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {!atLimit && !readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isPending}
              aria-label={`Adicionar foto de ${ATTACHMENT_CATEGORY_LABELS[category]}`}
              className={`hover:bg-accent/50 flex size-16 items-center justify-center rounded-md border border-dashed ${
                missing ? "border-destructive/60" : "border-input"
              }`}
            >
              {isPending ? (
                <span className="text-muted-foreground text-xs">…</span>
              ) : (
                <Plus className="text-muted-foreground size-5" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => cameraRef.current?.click()}>
                <Camera className="size-4" />
                Tirar foto
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => galleryRef.current?.click()}>
                <ImageIcon className="size-4" />
                Escolher da galeria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
  readOnly,
}: {
  companyId: string;
  workOrderId: string;
  maintenanceRecordId: string;
  equipmentId: string;
  categories: AttachmentCategory[];
  attachments: OfflineAttachment[];
  readOnly?: boolean;
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
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
