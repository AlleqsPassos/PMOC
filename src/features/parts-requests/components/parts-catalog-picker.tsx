"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Escolha da peça a partir do catálogo (Fase 10) — o técnico não digita o nome
 * em campo, seleciona. O catálogo vem do Dexie (`partsCatalog`, populado pelo
 * pull), então funciona offline.
 *
 * "Outra peça" continua existindo de propósito: o catálogo cobre o comum, não
 * fecha a porta para o incomum. Sem essa saída, uma peça fora da lista viraria
 * um pedido impossível de registrar em campo.
 */
const OTHER = "__outra__";

export function PartsCatalogPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (partName: string) => void;
  id?: string;
}) {
  const catalog = useLiveQuery(() => offlineDb.partsCatalog.orderBy("name").toArray(), []);
  const [isOther, setIsOther] = useState(false);

  const selected = isOther
    ? OTHER
    : catalog?.some((p) => p.name === value)
      ? value
      : "";

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={selected}
        onValueChange={(next) => {
          if (next === OTHER) {
            setIsOther(true);
            onChange("");
            return;
          }
          setIsOther(false);
          onChange(next);
        }}
      >
        <SelectTrigger className="w-full" id={id}>
          <SelectValue placeholder="Selecione a peça" />
        </SelectTrigger>
        <SelectContent>
          {(catalog ?? []).map((p) => (
            <SelectItem key={p.id} value={p.name}>
              {p.name}
              {p.unit ? ` (${p.unit})` : ""}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Outra peça…</SelectItem>
        </SelectContent>
      </Select>

      {isOther && (
        <Input
          autoFocus
          placeholder="Nome da peça"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Nome da outra peça"
        />
      )}
    </div>
  );
}
