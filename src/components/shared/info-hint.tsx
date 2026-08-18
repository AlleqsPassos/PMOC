"use client";

import { useState } from "react";
import { Info } from "lucide-react";

/**
 * Explicação sob demanda: um "i" ao lado do título que revela o texto ao toque
 * (ou ao passar o mouse), em vez de deixar a dica ocupando duas linhas embaixo
 * de cada cartão.
 *
 * O usuário reclamou disso olhando o app no celular: as frases de ajuda estavam
 * certas, mas empilhadas em toda tela elas roubam a altura do que ele foi ali
 * fazer. Quem já sabe usar o app não precisa lê-las de novo todo dia.
 *
 * Não usa o primitivo de Tooltip do Radix porque tooltip é gesto de mouse —
 * em toque ele depende de long-press e frequentemente não abre. Um botão com
 * estado próprio funciona nos dois, e o `title` cobre o hover de teclado/mouse
 * sem JavaScript nenhum.
 */
export function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        title={text}
        aria-label={open ? "Esconder explicação" : "Ver explicação"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-full transition-colors"
      >
        <Info className="size-4" />
      </button>
      {open && (
        <span
          role="note"
          className="bg-popover text-popover-foreground absolute top-7 left-0 z-30 w-64 rounded-lg p-3 text-xs leading-relaxed font-normal shadow-md ring-1 ring-foreground/10"
        >
          {text}
        </span>
      )}
    </span>
  );
}
