import type { ReactNode } from "react";

export function AuthPageShell({
  title,
  description,
  children,
}: {
  /** Omitido quando o próprio conteúdo controla o cabeçalho (ex.: /login,
   * que alterna entre "Entrar" e "Ativar acesso" no cliente). */
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-primary text-xl font-semibold tracking-tight">
          PMOC+
        </span>
      </div>

      <div className="border-border bg-card w-full max-w-sm rounded-lg border p-6 shadow-sm">
        {title && (
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
