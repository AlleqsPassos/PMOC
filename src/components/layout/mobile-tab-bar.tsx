"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Barra de navegação inferior — só no celular, e só para o técnico.
 *
 * O menu lateral em gaveta é desenho de tela grande: no celular ele exige abrir
 * um painel que cobre a tela inteira para trocar de seção, e o técnico troca o
 * tempo todo entre o trabalho do dia e o cadastro de equipamentos. Com três
 * destinos, a barra fixa embaixo resolve em um toque, no alcance do polegar.
 *
 * Não aparece para o despachante: a tela dele tem sete ou oito entradas de menu,
 * que não cabem numa barra, e a coordenação acontece no computador.
 *
 * Os itens saem do mesmo `primaryNavItems` do menu lateral, filtrados pelas
 * mesmas regras (permissão + `dispatcherOnly`) — uma lista paralela sairia de
 * sincronia na primeira tela nova, que foi o motivo de `is-dispatcher.ts` existir.
 */
export function MobileTabBar({ permissionKeys }: { permissionKeys: string[] }) {
  const pathname = usePathname();
  const keys = new Set(permissionKeys);

  const items = primaryNavItems.filter(
    (item) =>
      !item.dispatcherOnly &&
      !item.comingSoon &&
      (!item.requiredPermission || keys.has(item.requiredPermission)),
  );

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="bg-background fixed inset-x-0 bottom-0 z-40 grid border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
              isActive ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
