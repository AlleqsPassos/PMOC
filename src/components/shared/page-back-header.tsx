import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * Cabeçalho das telas do técnico: um botão de voltar de verdade, o título, e o
 * que precisar ficar à direita.
 *
 * Existe porque a trilha de texto que essas telas usavam ("Unidade / Corretivas"
 * em links pequenos) é desenho de tela larga: no celular, que é onde o técnico
 * de fato trabalha, o alvo de toque fica minúsculo e o gesto de voltar do
 * sistema é a única saída — e ele não existe quando o app roda instalado como
 * PWA em tela cheia. O destino é explícito (`href`), não `history.back()`:
 * chegar por link direto ou recarregar a página não pode deixar o botão sem
 * para onde ir.
 *
 * O alvo tem 44px de altura e borda visível (Fase 12): a primeira versão era um
 * link de texto com ícone de 16px, e o usuário reclamou de dar trabalho acertar
 * com o dedo — 44px é o mínimo recomendado para toque, e a borda diz que ali é
 * um botão, não um rótulo.
 */
export function PageBackHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={backHref}
        className="border-input bg-background hover:bg-accent/50 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg border pr-4 pl-2.5 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="size-5" />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground truncate text-sm">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
