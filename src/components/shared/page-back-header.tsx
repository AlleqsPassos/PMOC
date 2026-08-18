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
    <div className="flex flex-col gap-2">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground -ml-2 inline-flex w-fit items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" />
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
