import { CheckCircle2, CircleDot, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Selo colorido das três divisões do trabalho do técnico (Fase 13).
 *
 * Cor é o que o usuário pediu depois de ver a tela no celular: com tudo em
 * cinza, "concluído" e "impedido" só se distinguem lendo a palavra, e quem está
 * em pé numa casa de máquinas não lê, bate o olho. Verde = feito, vermelho =
 * parado, azul = a fazer.
 *
 * Fica em `components/shared` e não em cada tela porque a mesma escala aparece
 * no Início, na unidade e nas listas — três cópias divergiriam na primeira
 * mudança de tom, que é o mesmo motivo de `offline-queries.ts` centralizar a
 * classificação.
 */
export type WorkBucketTone = "aberto" | "impedimento" | "concluido";

const TONE_CLASS: Record<WorkBucketTone, string> = {
  // Tons explícitos (e não os tokens do tema) porque o significado é semântico,
  // não de marca: verde/vermelho/azul precisam continuar sendo verde/vermelho/
  // azul nos dois temas.
  aberto:
    "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  impedimento:
    "border-red-300 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  concluido:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

const TONE_ICON: Record<WorkBucketTone, typeof CheckCircle2> = {
  aberto: CircleDot,
  impedimento: TriangleAlert,
  concluido: CheckCircle2,
};

export function WorkBucketBadge({
  tone,
  children,
  className,
}: {
  tone: WorkBucketTone;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  );
}
